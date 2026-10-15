/**
 * Request handlers of the demo API. `handleRequest` is transport-agnostic (the
 * axios adapter in adapter.ts feeds it), so it can also be driven from Node tests.
 */
import { FALLBACK_LAYOUT, LayoutConfig } from '../lib/certificate';
import { validateCsv } from './csv';
import {
  addAudit,
  cacheEvict,
  cacheLookup,
  cancelBatch,
  certFileName,
  emit,
  nextCertNumber,
  pipeOf,
  refreshBatch,
  replayDlq,
  requeueEmail,
  startBatch,
  TOPIC_DLQ,
  TOPIC_GENERATED,
  TOPIC_JOBS,
} from './engine';
import { buildPdf } from './pdf';
import type {
  AuditRec,
  BatchRec,
  CertRec,
  Chaos,
  DB,
  EventRec,
  JobRec,
  MemberRec,
  OrgRec,
  Pipe,
  Role,
  TemplateRec,
  UserRec,
} from './types';
import { fmtDate, HttpError, iso, isEmail, newOtp, newToken, slugify, uuid, ymd, MIN } from './util';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ApiRequest {
  method: string;
  path: string; // without the /api/v1 prefix, starts with '/'
  query: Record<string, string>;
  body: any;
  token: string | null;
}
export interface ApiResult {
  status: number;
  body?: any;
  binary?: { bytes: Uint8Array; type: string; fileName?: string };
  headers?: Record<string, string>;
}

interface Ctx {
  db: DB;
  user: UserRec | null;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  now: number;
  headers: Record<string, string>;
}
type Handler = (c: Ctx) => any;
interface Route {
  method: string;
  parts: string[];
  isPublic: boolean;
  handler: Handler;
}

const ok = (data: any, message?: string) => ({ success: true, ...(message ? { message } : {}), data });
const RANK: Record<Role, number> = { VIEWER: 0, OPERATOR: 1, ADMIN: 2, OWNER: 3 };
const ROLES: Role[] = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'];

/* ------------------------------------------------------------------ */
/* Shared lookups + DTOs                                               */
/* ------------------------------------------------------------------ */

function me(c: Ctx): UserRec {
  if (!c.user) throw new HttpError(401, 'Authentication required');
  return c.user;
}

function requireOrg(c: Ctx, orgId: string, min: Role): MemberRec {
  const u = me(c);
  const org = c.db.orgs[orgId];
  if (!org) throw new HttpError(404, 'Organization not found');
  const m = c.db.members.find((x) => x.orgId === orgId && x.userId === u.id);
  if (!m) throw new HttpError(403, 'You are not a member of this organization');
  if (RANK[m.role] < RANK[min]) throw new HttpError(403, `This action requires the ${min} role or higher (you are ${m.role})`);
  return m;
}

function requireEvent(c: Ctx, eventId: string, min: Role): EventRec {
  const ev = c.db.events[eventId];
  if (!ev) throw new HttpError(404, 'Event not found');
  requireOrg(c, ev.orgId, min);
  return ev;
}

function requireCert(c: Ctx, id: string, min: Role): CertRec {
  const cert = c.db.certs[id];
  if (!cert) throw new HttpError(404, 'Certificate not found');
  requireEvent(c, cert.eventId, min);
  return cert;
}

function requireBatch(c: Ctx, id: string, min: Role): BatchRec {
  const b = c.db.batches[id];
  if (!b) throw new HttpError(404, 'Batch not found');
  requireOrg(c, b.orgId, min);
  return b;
}

function userDto(db: DB, u: UserRec) {
  const organizations = db.members
    .filter((m) => m.userId === u.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((m) => {
      const o = db.orgs[m.orgId];
      return { organizationId: o.id, organizationName: o.name, organizationSlug: o.slug, role: m.role };
    });
  return { id: u.id, email: u.email, fullName: u.fullName, organizations };
}

function eventDto(db: DB, e: EventRec) {
  const batchCount = Object.values(db.batches).filter((b) => b.eventId === e.id && b.status !== 'DRAFT').length;
  const certificateCount = Object.values(db.certs).filter((x) => x.eventId === e.id).length;
  return {
    id: e.id,
    organizationId: e.orgId,
    name: e.name,
    description: e.description,
    eventDate: e.eventDate,
    archived: e.archived,
    batchCount,
    certificateCount,
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
  };
}

function templateDto(t: TemplateRec) {
  return {
    id: t.id,
    eventId: t.eventId,
    name: t.name,
    version: t.version,
    orientation: t.orientation,
    width: t.width,
    height: t.height,
    layoutConfig: t.layoutConfig,
    backgroundUrl: t.backgroundDataUrl,
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
  };
}

function batchDto(db: DB, b: BatchRec) {
  const t = db.templates[b.templateId];
  return {
    id: b.id,
    eventId: b.eventId,
    templateId: b.templateId,
    templateName: t ? t.name : null,
    name: b.name,
    totalCount: b.total,
    // PDFs that went through cleanly; email failures are reported in failedCount so that
    // (generatedCount + failedCount) / totalCount never exceeds 100%.
    generatedCount: Math.max(0, b.generated - b.failed),
    emailSentCount: b.emailSent,
    failedCount: b.failed,
    status: b.status,
    createdAt: iso(b.createdAt),
    startedAt: iso(b.startedAt),
    completedAt: iso(b.completedAt),
  };
}

function certDto(db: DB, c: CertRec) {
  const ev = db.events[c.eventId];
  const org = db.orgs[c.orgId];
  return {
    id: c.id,
    jobId: c.jobId,
    batchId: c.batchId,
    eventId: c.eventId,
    eventName: ev ? ev.name : '',
    organizationName: org ? org.name : '',
    templateId: c.templateId,
    certificateType: c.certificateType,
    issueDate: iso(c.issuedAt),
    issuedAt: iso(c.issuedAt),
    createdAt: iso(c.createdAt),
    participantName: c.participantName,
    recipientEmail: c.recipientEmail,
    certificateNumber: c.certificateNumber,
    verificationToken: c.verificationToken,
    status: c.status,
    emailStatus: c.emailStatus,
    emailErrorMessage: c.emailErrorMessage,
    replacedByCertificateId: c.replacedById,
    replacedById: c.replacedById,
    replacementForId: c.replacementForId,
    revokedReason: c.revocationReason,
    revocationReason: c.revocationReason,
    revokedAt: iso(c.revokedAt),
  };
}

function jobDto(j: JobRec) {
  return {
    jobId: j.id,
    certificateId: j.certificateId,
    participantName: j.participantName,
    email: j.email,
    status: j.status,
    emailStatus: j.emailStatus,
    attemptCount: j.attemptCount,
    errorMessage: j.errorMessage,
    updatedAt: iso(j.updatedAt),
  };
}

function certValues(db: DB, c: CertRec) {
  const ev = db.events[c.eventId];
  const org = db.orgs[c.orgId];
  return {
    participant_name: c.participantName,
    event_name: ev ? ev.name : '',
    organization_name: org ? org.name : '',
    certificate_type: c.certificateType,
    issue_date: fmtDate(c.issuedAt),
    certificate_number: c.certificateNumber,
  };
}

function layoutOf(db: DB, c: CertRec): LayoutConfig {
  return db.templates[c.templateId]?.layoutConfig ?? FALLBACK_LAYOUT;
}

function verifyUrlFor(token: string): string {
  const loc = (globalThis as any).location;
  const origin = loc?.origin && loc.origin !== 'null' ? loc.origin : 'http://localhost:5173';
  const pathname = loc?.pathname ?? '/';
  return `${origin}${pathname}#/verify/${token}`;
}

function paginate<T>(arr: T[], c: Ctx, defSize: number): T[] {
  const size = Math.min(1000, Math.max(1, parseInt(c.query.size ?? '', 10) || defSize));
  const page = Math.max(0, parseInt(c.query.page ?? '', 10) || 0);
  c.headers['X-Total-Count'] = String(arr.length);
  return arr.slice(page * size, page * size + size);
}

function audit(c: Ctx, orgId: string, action: string, type: string, id: string | null, details: Record<string, unknown>) {
  addAudit(c.db, orgId, c.user ? c.user.id : null, action, type, id, details, c.now);
}

function session(db: DB, u: UserRec): string {
  const t = newToken();
  db.sessions[t] = u.id;
  return t;
}

function normEmail(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

function needStr(v: any, msg: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new HttpError(400, msg);
  return s;
}

function createOrg(db: DB, name: string, owner: UserRec, now: number): OrgRec {
  let slug = slugify(name);
  const taken = new Set(Object.values(db.orgs).map((o) => o.slug));
  if (taken.has(slug)) {
    let n = 2;
    while (taken.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }
  const org: OrgRec = { id: uuid(), name, slug, createdAt: now };
  db.orgs[org.id] = org;
  db.members.push({ id: uuid(), orgId: org.id, userId: owner.id, role: 'OWNER', createdAt: now });
  pipeOf(db, org.id);
  addAudit(db, org.id, owner.id, 'ORGANIZATION_CREATED', 'ORGANIZATION', org.id, { name }, now);
  return org;
}

/* ------------------------------------------------------------------ */
/* Pipeline DTO                                                        */
/* ------------------------------------------------------------------ */

export function pipelineDto(db: DB, orgId: string, now: number = Date.now()) {
  const p: Pipe = pipeOf(db, orgId);
  const pending = db.outbox.filter((r) => r.orgId === orgId).length;
  return {
    publisher: {
      status: p.chaos.publisherDown ? 'STOPPED' : 'RUNNING',
      lastPublishedAt: iso(p.publisherLastPublishedAt),
    },
    outbox: { pending, published: p.outboxPublished, failed: p.outboxFailed },
    topics: [
      { name: TOPIC_JOBS, depth: p.jobsQueue.length, produced: p.jobsProduced, consumed: p.jobsConsumed },
      { name: TOPIC_GENERATED, depth: p.genQueue.length + p.retries.length, produced: p.genProduced, consumed: p.genConsumed },
      { name: TOPIC_DLQ, depth: p.dlq.length, produced: p.counters.dlqTotal, consumed: p.dlqReplayed },
    ],
    workers: p.workers.map((w) => ({
      id: w.id,
      type: w.type,
      status: w.taskId ? 'BUSY' : 'IDLE',
      processed: w.processed,
      currentTask: w.taskId ? w.taskLabel : null,
    })),
    counters: { ...p.counters },
    chaos: { ...p.chaos },
    dlq: p.dlq.map((d) => ({
      id: d.id,
      certificateId: d.certificateId,
      participantName: d.participantName,
      recipientEmail: d.recipientEmail,
      reason: d.reason,
      attempts: d.attempts,
      at: iso(d.at),
    })),
    events: p.events.map((e) => ({ id: e.id, at: iso(e.at), kind: e.kind, message: e.message })),
    mailbox: p.mailbox.slice(0, 20).map((m) => ({
      id: m.id,
      at: iso(m.at),
      to: m.to,
      subject: m.subject,
      certificateId: m.certificateId,
      attachmentName: m.attachmentName,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Route table                                                         */
/* ------------------------------------------------------------------ */

const routes: Route[] = [];
function route(method: string, path: string, handler: Handler, isPublic = false) {
  routes.push({ method, parts: path.split('/').filter(Boolean), isPublic, handler });
}

/* ---------- auth ---------- */

route('POST', '/auth/register', (c) => {
  const b = c.body || {};
  const fullName = needStr(b.fullName, 'Full name is required');
  const email = normEmail(b.email);
  if (!email) throw new HttpError(400, 'Email is required');
  if (!isEmail(email)) throw new HttpError(400, 'Invalid email format');
  const password = String(b.password ?? '');
  if (!password) throw new HttpError(400, 'Password is required');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (Object.values(c.db.users).some((u) => u.email === email)) {
    throw new HttpError(409, 'An account with this email already exists. Please sign in instead.');
  }
  const organizationName = typeof b.organizationName === 'string' && b.organizationName.trim() ? b.organizationName.trim() : `${fullName}'s Organization`;
  const otp = newOtp();
  c.db.pendingRegs[email] = { email, fullName, password, organizationName, otp, expiresAt: c.now + 10 * MIN };
  return ok({ demoOtp: otp, expiresInSeconds: 600 }, `Verification code sent to ${email}`);
}, true);

route('POST', '/auth/verify-otp', (c) => {
  const email = normEmail(c.body?.email);
  const otp = String(c.body?.otp ?? '').trim();
  if (!email) throw new HttpError(400, 'Email is required');
  if (!otp) throw new HttpError(400, 'OTP code is required');
  const reg = c.db.pendingRegs[email];
  if (!reg) throw new HttpError(400, 'No pending registration found for this email. Please register again.');
  if (reg.expiresAt < c.now) throw new HttpError(400, 'Verification code has expired. Please request a new one.');
  if (reg.otp !== otp) throw new HttpError(400, 'Invalid verification code. Please check and try again.');
  const user: UserRec = { id: uuid(), email, fullName: reg.fullName, password: reg.password, createdAt: c.now };
  c.db.users[user.id] = user;
  createOrg(c.db, reg.organizationName, user, c.now);
  delete c.db.pendingRegs[email];
  return ok({ token: session(c.db, user), user: userDto(c.db, user) }, 'Email verified and account created successfully');
}, true);

route('POST', '/auth/login', (c) => {
  const email = normEmail(c.body?.email);
  const password = String(c.body?.password ?? '');
  if (!email) throw new HttpError(400, 'Email is required');
  if (!password) throw new HttpError(400, 'Password is required');
  const user = Object.values(c.db.users).find((u) => u.email === email);
  if (!user) {
    if (c.db.pendingRegs[email]) throw new HttpError(403, 'Email not verified yet. Please complete registration with the 6-digit code.');
    throw new HttpError(401, 'Invalid email or password');
  }
  if (user.password !== password) throw new HttpError(401, 'Invalid email or password');
  return ok({ token: session(c.db, user), user: userDto(c.db, user) }, 'Login successful');
}, true);

route('POST', '/auth/logout', (c) => ok(null, 'Logged out successfully'), true);

route('GET', '/auth/me', (c) => ok(userDto(c.db, me(c))));

route('POST', '/auth/forgot-password', (c) => {
  const email = normEmail(c.body?.email);
  if (!email) throw new HttpError(400, 'Email is required');
  if (!isEmail(email)) throw new HttpError(400, 'Invalid email format');
  if (!Object.values(c.db.users).some((u) => u.email === email)) {
    throw new HttpError(404, 'No account found with this email address');
  }
  const otp = newOtp();
  c.db.pendingResets[email] = { email, otp, expiresAt: c.now + 10 * MIN };
  return ok({ demoOtp: otp, expiresInSeconds: 600 }, `Password reset code sent to ${email}`);
}, true);

route('POST', '/auth/reset-password', (c) => {
  const email = normEmail(c.body?.email);
  const otp = String(c.body?.otp ?? '').trim();
  const pw = String(c.body?.newPassword ?? '');
  if (!email) throw new HttpError(400, 'Email is required');
  if (!otp) throw new HttpError(400, 'OTP code is required');
  if (pw.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const r = c.db.pendingResets[email];
  if (!r) throw new HttpError(400, 'No reset request found for this email. Please request a new code.');
  if (r.expiresAt < c.now) throw new HttpError(400, 'Reset code has expired. Please request a new one.');
  if (r.otp !== otp) throw new HttpError(400, 'Invalid reset code. Please check and try again.');
  const user = Object.values(c.db.users).find((u) => u.email === email);
  if (!user) throw new HttpError(404, 'No account found with this email address');
  user.password = pw;
  delete c.db.pendingResets[email];
  return ok(null, 'Password reset successfully. You can now log in.');
}, true);

/* ---------- organizations ---------- */

route('GET', '/organizations', (c) => ok(userDto(c.db, me(c)).organizations));

route('POST', '/organizations', (c) => {
  const name = needStr(c.body?.name, 'Organization name is required');
  const org = createOrg(c.db, name, me(c), c.now);
  return ok({ id: org.id, name: org.name, slug: org.slug, createdAt: iso(org.createdAt) }, 'Organization created');
});

route('GET', '/organizations/:orgId/members', (c) => {
  requireOrg(c, c.params.orgId, 'VIEWER');
  const list = c.db.members
    .filter((m) => m.orgId === c.params.orgId)
    .sort((a, b) => RANK[b.role] - RANK[a.role] || a.createdAt - b.createdAt)
    .map((m) => {
      const u = c.db.users[m.userId];
      return { id: m.id, userId: m.userId, name: u?.fullName ?? 'Unknown', email: u?.email ?? '', role: m.role, joinedAt: iso(m.createdAt) };
    });
  return ok(list);
});

route('POST', '/organizations/:orgId/members', (c) => {
  const orgId = c.params.orgId;
  requireOrg(c, orgId, 'ADMIN');
  const email = normEmail(c.body?.email);
  if (!email) throw new HttpError(400, 'Email is required');
  if (!isEmail(email)) throw new HttpError(400, 'Invalid email format');
  const role = String(c.body?.role ?? 'OPERATOR').toUpperCase() as Role;
  if (!ROLES.includes(role)) throw new HttpError(400, `Invalid role. Use one of ${ROLES.join(', ')}`);
  if (role === 'OWNER') throw new HttpError(400, 'An organization can only have its creator as OWNER');
  let user = Object.values(c.db.users).find((u) => u.email === email);
  if (!user) {
    const local = email.split('@')[0];
    user = { id: uuid(), email, fullName: local.charAt(0).toUpperCase() + local.slice(1), password: 'Demo@1234', createdAt: c.now };
    c.db.users[user.id] = user;
  }
  if (c.db.members.some((m) => m.orgId === orgId && m.userId === user!.id)) {
    throw new HttpError(409, 'User is already a member of this organization');
  }
  const m: MemberRec = { id: uuid(), orgId, userId: user.id, role, createdAt: c.now };
  c.db.members.push(m);
  audit(c, orgId, 'MEMBER_ADDED', 'MEMBER', m.id, { email, role });
  return ok({ id: m.id, userId: user.id, name: user.fullName, email, role, joinedAt: iso(m.createdAt) }, 'Member added successfully');
});

route('GET', '/organizations/:orgId/dashboard-stats', (c) => {
  const orgId = c.params.orgId;
  requireOrg(c, orgId, 'VIEWER');
  const events = Object.values(c.db.events).filter((e) => e.orgId === orgId);
  const batches = Object.values(c.db.batches).filter((b) => b.orgId === orgId && b.status !== 'DRAFT');
  let total = 0;
  let gen = 0;
  let sent = 0;
  let failed = 0;
  let cancelled = 0;
  for (const b of batches) {
    total += b.total;
    gen += b.generated;
    sent += b.emailSent;
    failed += b.failed;
    cancelled += b.cancelled;
  }
  const recent = [...batches]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((b) => ({ ...batchDto(c.db, b), eventName: c.db.events[b.eventId]?.name ?? '' }));
  return ok({
    totalEvents: events.length,
    totalParticipants: total,
    totalCertificatesGenerated: gen,
    totalEmailsSent: sent,
    totalFailed: failed,
    totalPendingJobs: Math.max(0, total - gen - cancelled),
    recentBatches: recent,
  });
});

route('GET', '/organizations/:orgId/audit-logs', (c) => {
  requireOrg(c, c.params.orgId, 'ADMIN');
  const rows = c.db.audit
    .filter((a) => a.organizationId === c.params.orgId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((a: AuditRec) => ({ ...a, createdAt: iso(a.createdAt) }));
  return ok(paginate(rows, c, 50));
});

route('GET', '/organizations/:orgId/pipeline', (c) => {
  requireOrg(c, c.params.orgId, 'VIEWER');
  return ok(pipelineDto(c.db, c.params.orgId, c.now));
});

route('POST', '/organizations/:orgId/pipeline/chaos', (c) => {
  const orgId = c.params.orgId;
  requireOrg(c, orgId, 'OPERATOR');
  const patch: Partial<Chaos> = c.body || {};
  const p = pipeOf(c.db, orgId);
  if (patch.smtpMode !== undefined) {
    if (!['NONE', 'TRANSIENT', 'PERMANENT'].includes(patch.smtpMode as string)) throw new HttpError(400, 'smtpMode must be NONE, TRANSIENT or PERMANENT');
    p.chaos.smtpMode = patch.smtpMode;
  }
  if (patch.publisherDown !== undefined) p.chaos.publisherDown = !!patch.publisherDown;
  if (patch.duplicateDelivery !== undefined) p.chaos.duplicateDelivery = !!patch.duplicateDelivery;
  return ok(pipelineDto(c.db, orgId, c.now), 'Chaos settings updated');
});

route('POST', '/organizations/:orgId/pipeline/dlq/:dlqId/replay', (c) => {
  const orgId = c.params.orgId;
  requireOrg(c, orgId, 'OPERATOR');
  if (!replayDlq(c.db, orgId, c.params.dlqId, c.now)) throw new HttpError(404, 'Dead-letter entry not found');
  return ok(pipelineDto(c.db, orgId, c.now), 'Message replayed from the dead-letter topic');
});

/* ---------- events ---------- */

route('GET', '/events', (c) => {
  const orgId = c.query.organizationId;
  if (!orgId) throw new HttpError(400, 'organizationId is required');
  requireOrg(c, orgId, 'VIEWER');
  const list = Object.values(c.db.events)
    .filter((e) => e.orgId === orgId)
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : a.eventDate > b.eventDate ? -1 : b.createdAt - a.createdAt));
  return ok(list.map((e) => eventDto(c.db, e)));
});

route('POST', '/events', (c) => {
  const b = c.body || {};
  const orgId = needStr(b.organizationId, 'Organization ID is required');
  requireOrg(c, orgId, 'ADMIN');
  const name = needStr(b.name, 'Event name is required');
  const date = needStr(b.eventDate, 'Event date is required');
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) throw new HttpError(400, 'Event date must be YYYY-MM-DD');
  const e: EventRec = {
    id: uuid(),
    orgId,
    name,
    description: typeof b.description === 'string' ? b.description.trim() : '',
    eventDate: date.slice(0, 10),
    archived: false,
    createdAt: c.now,
    updatedAt: c.now,
  };
  c.db.events[e.id] = e;
  audit(c, orgId, 'EVENT_CREATED', 'EVENT', e.id, { name });
  return ok(eventDto(c.db, e), 'Event created successfully');
});

route('GET', '/events/:eventId', (c) => ok(eventDto(c.db, requireEvent(c, c.params.eventId, 'VIEWER'))));

route('PUT', '/events/:eventId', (c) => {
  const e = requireEvent(c, c.params.eventId, 'ADMIN');
  const b = c.body || {};
  e.name = needStr(b.name, 'Event name is required');
  if (typeof b.description === 'string') e.description = b.description.trim();
  if (b.eventDate) e.eventDate = String(b.eventDate).slice(0, 10);
  if (typeof b.archived === 'boolean') e.archived = b.archived;
  e.updatedAt = c.now;
  audit(c, e.orgId, 'EVENT_UPDATED', 'EVENT', e.id, { name: e.name });
  return ok(eventDto(c.db, e), 'Event updated successfully');
});

/* ---------- templates ---------- */

function saveTemplate(c: Ctx, ev: EventRec) {
  const t = c.body?.template ?? c.body;
  if (!t || typeof t !== 'object') throw new HttpError(400, 'Template payload is required');
  const name = needStr(t.name, 'Template name is required');
  const layout = t.layoutConfig as LayoutConfig | undefined;
  if (!layout || !Array.isArray(layout.textElements)) throw new HttpError(400, 'Layout configuration is required');
  const prev = Object.values(c.db.templates)
    .filter((x) => x.eventId === ev.id && x.name === name)
    .sort((a, b) => b.version - a.version)[0];
  const bg: string | null = c.body?.__backgroundDataUrl ?? prev?.backgroundDataUrl ?? null;
  const rec: TemplateRec = {
    id: uuid(),
    eventId: ev.id,
    orgId: ev.orgId,
    name,
    version: prev ? prev.version + 1 : 1,
    layoutConfig: layout,
    orientation: String(t.orientation ?? layout.orientation ?? 'LANDSCAPE'),
    width: Number(t.width ?? layout.width ?? 842),
    height: Number(t.height ?? layout.height ?? 595),
    backgroundDataUrl: bg,
    createdAt: c.now,
    updatedAt: c.now,
  };
  c.db.templates[rec.id] = rec;
  audit(c, ev.orgId, 'TEMPLATE_SAVED', 'TEMPLATE', rec.id, { name, version: rec.version, event: ev.name });
  return rec;
}

route('GET', '/events/:eventId/templates', (c) => {
  const ev = requireEvent(c, c.params.eventId, 'VIEWER');
  const all = Object.values(c.db.templates).filter((t) => t.eventId === ev.id);
  const latest = all.filter((t) => !all.some((o) => o.name === t.name && o.version > t.version));
  latest.sort((a, b) => b.updatedAt - a.updatedAt);
  return ok(latest.map(templateDto));
});

route('POST', '/events/:eventId/templates', (c) => {
  const ev = requireEvent(c, c.params.eventId, 'ADMIN');
  return ok(templateDto(saveTemplate(c, ev)), 'Template created successfully');
});

route('GET', '/templates/:templateId', (c) => {
  const t = c.db.templates[c.params.templateId];
  if (!t) throw new HttpError(404, 'Template not found');
  requireOrg(c, t.orgId, 'VIEWER');
  return ok(templateDto(t));
});

route('PUT', '/templates/:templateId', (c) => {
  const old = c.db.templates[c.params.templateId];
  if (!old) throw new HttpError(404, 'Template not found');
  const ev = requireEvent(c, old.eventId, 'ADMIN');
  return ok(templateDto(saveTemplate(c, ev)), 'Template updated successfully');
});

route('POST', '/templates/preview', (c) => {
  me(c);
  const b = c.body || {};
  const layout: LayoutConfig = b.layoutConfig && Array.isArray(b.layoutConfig.textElements) ? b.layoutConfig : FALLBACK_LAYOUT;
  const bytes = buildPdf(layout, {
    participant_name: b.sampleParticipantName || 'Priya Sharma',
    event_name: b.sampleEventName || 'National AI Hackathon 2026',
    organization_name: b.sampleOrganizationName || 'CertFlow Academy',
    certificate_type: b.sampleCertificateType || 'Winner',
    issue_date: fmtDate(c.now),
    certificate_number: 'CF-2026-000128',
  });
  return { __binary: { bytes, type: 'application/pdf', fileName: 'certificate-preview.pdf' } };
});

/* ---------- participants import ---------- */

route('POST', '/events/:eventId/participants/import', (c) => {
  requireEvent(c, c.params.eventId, 'OPERATOR');
  const text = c.body?.__fileText;
  if (typeof text !== 'string') throw new HttpError(400, 'A CSV file is required (multipart field "file")');
  return ok(validateCsv(text), 'CSV validated');
});

/* ---------- batches ---------- */

route('GET', '/events/:eventId/batches', (c) => {
  const ev = requireEvent(c, c.params.eventId, 'VIEWER');
  const list = Object.values(c.db.batches)
    .filter((b) => b.eventId === ev.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  return ok(paginate(list, c, 200).map((b) => batchDto(c.db, b)));
});

route('POST', '/events/:eventId/batches', (c) => {
  const ev = requireEvent(c, c.params.eventId, 'OPERATOR');
  const b = c.body || {};
  const name = needStr(b.name, 'Batch name is required');
  const tpl = c.db.templates[String(b.templateId ?? '')];
  if (!b.templateId) throw new HttpError(400, 'Template ID is required');
  if (!tpl || tpl.eventId !== ev.id) throw new HttpError(404, 'Template not found for this event');
  if (!Array.isArray(b.participants) || b.participants.length === 0) throw new HttpError(400, 'At least one participant is required');
  const participants = (b.participants as any[]).map((p, i) => {
    const pn = String(p?.participantName ?? '').trim();
    const em = String(p?.email ?? '').trim();
    if (!pn) throw new HttpError(400, `Participant #${i + 1}: name is required`);
    if (!isEmail(em)) throw new HttpError(400, `Participant #${i + 1}: invalid email "${em}"`);
    return { name: pn, email: em, type: String(p?.certificateType ?? '').trim() || 'Participant' };
  });
  const rec: BatchRec = {
    id: uuid(),
    orgId: ev.orgId,
    eventId: ev.id,
    templateId: tpl.id,
    name,
    status: 'DRAFT',
    participants,
    total: participants.length,
    generated: 0,
    emailSent: 0,
    failed: 0,
    cancelled: 0,
    createdAt: c.now,
    startedAt: null,
    completedAt: null,
  };
  c.db.batches[rec.id] = rec;
  audit(c, ev.orgId, 'BATCH_CREATED', 'BATCH', rec.id, { name, participants: participants.length });
  return ok(batchDto(c.db, rec), 'Batch created successfully');
});

route('GET', '/batches/:batchId', (c) => ok(batchDto(c.db, requireBatch(c, c.params.batchId, 'VIEWER'))));

route('POST', '/batches/:batchId/start', (c) => {
  const b = requireBatch(c, c.params.batchId, 'OPERATOR');
  if (b.status !== 'DRAFT') throw new HttpError(409, `Batch has already been started (status ${b.status})`);
  if (!c.db.templates[b.templateId]) throw new HttpError(404, 'Template not found');
  startBatch(c.db, b, c.now);
  audit(c, b.orgId, 'BATCH_STARTED', 'BATCH', b.id, { name: b.name, participants: b.total });
  return ok(batchDto(c.db, b), 'Batch queued for processing');
});

route('POST', '/batches/:batchId/cancel', (c) => {
  const b = requireBatch(c, c.params.batchId, 'OPERATOR');
  if (!['DRAFT', 'QUEUED', 'PROCESSING'].includes(b.status)) throw new HttpError(409, `Batch cannot be cancelled (status ${b.status})`);
  if (b.status === 'DRAFT') {
    b.status = 'CANCELLED';
    b.completedAt = c.now;
  } else {
    cancelBatch(c.db, b, c.now);
    refreshBatch(c.db, b, c.now);
    if (b.status !== 'CANCELLED') b.status = 'CANCELLED';
  }
  audit(c, b.orgId, 'BATCH_CANCELLED', 'BATCH', b.id, { name: b.name });
  return ok(null, 'Batch cancelled successfully');
});

route('GET', '/batches/:batchId/progress', (c) => {
  const b = requireBatch(c, c.params.batchId, 'VIEWER');
  const jobs = Object.values(c.db.jobs).filter((j) => j.batchId === b.id);
  const pdfPending = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'PROCESSING').length;
  const settled = b.emailSent + b.failed + b.cancelled;
  const pct = b.total > 0 ? Math.min(100, Math.round((settled / b.total) * 1000) / 10) : 0;
  const failures = jobs
    .filter((j) => j.status === 'FAILED' || j.emailStatus === 'FAILED')
    .map((j) => ({
      jobId: j.id,
      participantName: j.participantName,
      email: j.email,
      errorMessage: j.errorMessage,
      attemptCount: j.attemptCount,
      status: j.status,
      emailStatus: j.emailStatus,
      updatedAt: iso(j.updatedAt),
    }));
  return ok({
    batchId: b.id,
    batchName: b.name,
    status: b.status,
    totalParticipants: b.total,
    certificatesPending: pdfPending,
    certificatesGenerated: b.generated,
    emailsPending: Math.max(0, b.generated - b.emailSent - b.failed),
    emailsSent: b.emailSent,
    failedJobs: b.failed,
    progressPercentage: b.status === 'DRAFT' ? 0 : pct,
    recentFailures: failures.slice(0, 10),
  });
});

route('GET', '/batches/:batchId/jobs', (c) => {
  const b = requireBatch(c, c.params.batchId, 'VIEWER');
  const jobs = Object.values(c.db.jobs)
    .filter((j) => j.batchId === b.id)
    .sort((a, z) => a.createdAt - z.createdAt || a.participantName.localeCompare(z.participantName));
  return ok(paginate(jobs, c, 50).map(jobDto));
});

/* ---------- certificates ---------- */

route('GET', '/events/:eventId/certificates', (c) => {
  const ev = requireEvent(c, c.params.eventId, 'VIEWER');
  const q = (c.query.q ?? '').toLowerCase();
  const st = c.query.status;
  const list = Object.values(c.db.certs)
    .filter((x) => x.eventId === ev.id)
    .filter((x) => !st || x.status === st)
    .filter((x) => !q || x.participantName.toLowerCase().includes(q) || x.recipientEmail.toLowerCase().includes(q) || x.certificateNumber.toLowerCase().includes(q))
    .sort((a, b) => b.issuedAt - a.issuedAt || b.certificateNumber.localeCompare(a.certificateNumber));
  return ok(paginate(list, c, 200).map((x) => certDto(c.db, x)));
});

route('GET', '/certificates/:certId', (c) => ok(certDto(c.db, requireCert(c, c.params.certId, 'VIEWER'))));

route('GET', '/certificates/:certId/render-data', (c) => {
  const cert = requireCert(c, c.params.certId, 'VIEWER');
  const tpl = c.db.templates[cert.templateId];
  return ok({
    layoutConfig: layoutOf(c.db, cert),
    values: certValues(c.db, cert),
    verifyUrl: verifyUrlFor(cert.verificationToken),
    fileName: certFileName(cert),
    backgroundDataUrl: tpl ? tpl.backgroundDataUrl : null,
  });
});

route('GET', '/certificates/:certId/download', (c) => {
  const cert = requireCert(c, c.params.certId, 'VIEWER');
  const bytes = buildPdf(layoutOf(c.db, cert), certValues(c.db, cert));
  return { __binary: { bytes, type: 'application/pdf', fileName: certFileName(cert) } };
});

route('POST', '/certificates/:certId/resend', (c) => {
  const cert = requireCert(c, c.params.certId, 'OPERATOR');
  if (cert.status !== 'ISSUED') throw new HttpError(409, `Only valid certificates can be re-sent (this one is ${cert.status})`);
  requeueEmail(c.db, cert, 'Resend requested', c.now);
  audit(c, cert.orgId, 'CERTIFICATE_RESENT', 'CERTIFICATE', cert.id, { certificateNumber: cert.certificateNumber, to: cert.recipientEmail });
  return ok(null, 'Certificate email resend queued');
});

route('POST', '/certificates/:certId/revoke', (c) => {
  const cert = requireCert(c, c.params.certId, 'ADMIN');
  const reason = needStr(c.body?.reason, 'Revocation reason is required');
  if (cert.status === 'REVOKED') throw new HttpError(409, 'Certificate is already revoked');
  if (cert.status === 'REPLACED') throw new HttpError(409, 'Certificate has already been replaced');
  cert.status = 'REVOKED';
  cert.revocationReason = reason;
  cert.revokedAt = c.now;
  const pipe = pipeOf(c.db, cert.orgId);
  pipe.retries = pipe.retries.filter((r) => r.certId !== cert.id);
  emit(pipe, 'REVOKE', `Certificate ${cert.certificateNumber} (${cert.participantName}) revoked: ${reason}`, c.now);
  cacheEvict(c.db, cert, c.now);
  audit(c, cert.orgId, 'CERTIFICATE_REVOKED', 'CERTIFICATE', cert.id, { certificateNumber: cert.certificateNumber, reason });
  return ok(null, 'Certificate successfully revoked');
});

route('POST', '/certificates/:certId/replace', (c) => {
  const old = requireCert(c, c.params.certId, 'ADMIN');
  const b = c.body || {};
  const reason = needStr(b.reason, 'Reason for replacement is required');
  if (old.status !== 'ISSUED') throw new HttpError(409, `Only valid certificates can be replaced (this one is ${old.status})`);
  const newName = typeof b.updatedParticipantName === 'string' && b.updatedParticipantName.trim() ? b.updatedParticipantName.trim() : old.participantName;
  const newEmail = typeof b.updatedEmail === 'string' && b.updatedEmail.trim() ? b.updatedEmail.trim() : old.recipientEmail;
  const newType = typeof b.updatedCertificateType === 'string' && b.updatedCertificateType.trim() ? b.updatedCertificateType.trim() : old.certificateType;
  if (!isEmail(newEmail)) throw new HttpError(400, 'Invalid email address');
  const repl: CertRec = {
    id: uuid(),
    orgId: old.orgId,
    eventId: old.eventId,
    templateId: old.templateId,
    batchId: null,
    jobId: null,
    certificateType: newType,
    participantName: newName,
    recipientEmail: newEmail,
    certificateNumber: nextCertNumber(c.db, c.now),
    verificationToken: newToken(),
    status: 'ISSUED',
    emailStatus: 'PENDING',
    emailErrorMessage: null,
    counted: null,
    replacementForId: old.id,
    replacedById: null,
    revocationReason: null,
    revokedAt: null,
    issuedAt: c.now,
    createdAt: c.now,
  };
  c.db.certs[repl.id] = repl;
  old.status = 'REPLACED';
  old.replacedById = repl.id;
  old.revocationReason = reason;
  old.revokedAt = c.now;
  const pipe = pipeOf(c.db, old.orgId);
  pipe.retries = pipe.retries.filter((r) => r.certId !== old.id);
  emit(pipe, 'REVOKE', `Certificate ${old.certificateNumber} superseded by ${repl.certificateNumber} (${newName}): ${reason}`, c.now);
  cacheEvict(c.db, old, c.now);
  emit(pipe, 'STORE', `Issued replacement ${repl.certificateNumber} for ${newName}; produced ${TOPIC_GENERATED}`, c.now);
  pipe.genQueue.push({ certId: repl.id, attempts: 0 });
  pipe.genProduced += 1;
  audit(c, old.orgId, 'CERTIFICATE_REPLACED', 'CERTIFICATE', old.id, { from: old.certificateNumber, to: repl.certificateNumber, reason });
  return ok(certDto(c.db, repl), 'Replacement certificate created and queued');
});

/* ---------- public verification ---------- */

route('GET', '/public/verify/:token', (c) => {
  const token = decodeURIComponent(c.params.token || '').trim();
  const cert = token ? Object.values(c.db.certs).find((x) => x.verificationToken === token) : undefined;
  if (!cert) throw new HttpError(404, 'No certificate found with this verification token. The link may be invalid or expired.');
  const cache = cacheLookup(c.db, cert, c.now);
  const org = c.db.orgs[cert.orgId];
  const ev = c.db.events[cert.eventId];
  const tpl = c.db.templates[cert.templateId];
  const repl = cert.replacedById ? c.db.certs[cert.replacedById] : null;
  const message =
    cert.status === 'ISSUED'
      ? `This certificate is authentic and was issued by ${org?.name ?? 'the issuing organization'}.`
      : cert.status === 'REVOKED'
        ? 'This certificate has been revoked by the issuing organization and is no longer valid.'
        : 'This certificate has been superseded by a newer version and is no longer the current record.';
  return ok({
    valid: cert.status === 'ISSUED',
    status: cert.status,
    message,
    certificateNumber: cert.certificateNumber,
    participantName: cert.participantName,
    eventName: ev?.name ?? '',
    organizationName: org?.name ?? '',
    certificateType: cert.certificateType,
    issueDate: iso(cert.issuedAt),
    revocationReason: cert.status === 'ISSUED' ? null : cert.revocationReason,
    revokedAt: cert.status === 'ISSUED' ? null : iso(cert.revokedAt),
    replacementCertificateNumber: repl ? repl.certificateNumber : null,
    cache,
    preview: {
      layoutConfig: layoutOf(c.db, cert),
      values: certValues(c.db, cert),
      backgroundDataUrl: tpl ? tpl.backgroundDataUrl : null,
    },
  });
}, true);

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

function matchRoute(method: string, path: string): { route: Route; params: Record<string, string> } | null {
  const segs = path.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method || r.parts.length !== segs.length) continue;
    const params: Record<string, string> = {};
    let hit = true;
    for (let i = 0; i < segs.length; i++) {
      const p = r.parts[i];
      if (p.startsWith(':')) params[p.slice(1)] = segs[i];
      else if (p !== segs[i]) {
        hit = false;
        break;
      }
    }
    if (hit) return { route: r, params };
  }
  return null;
}

export function handleRequest(db: DB, req: ApiRequest, now: number = Date.now()): ApiResult {
  const method = req.method.toUpperCase();
  const path = req.path.replace(/\/+$/, '') || '/';
  const m = matchRoute(method, path);
  const fail = (status: number, message: string): ApiResult => ({ status, body: { success: false, message } });
  if (!m) return fail(404, `No route for ${method} ${path}`);
  let user: UserRec | null = null;
  if (req.token && db.sessions[req.token]) user = db.users[db.sessions[req.token]] ?? null;
  if (!m.route.isPublic && !user) return fail(401, 'Authentication required. Please sign in.');
  const headers: Record<string, string> = {};
  try {
    const out = m.route.handler({ db, user, params: m.params, query: req.query, body: req.body, now, headers });
    if (out && out.__binary) return { status: 200, binary: out.__binary, headers };
    return { status: 200, body: out, headers };
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.message);
    return fail(500, `Demo backend error: ${(e as Error)?.message ?? e}`);
  }
}
