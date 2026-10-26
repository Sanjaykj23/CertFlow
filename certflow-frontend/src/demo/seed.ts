/** First-load seed for the demo database. Every timestamp is relative to `now`. */
import type { LayoutConfig, TextElement } from '../lib/certificate';
import {
  addAudit,
  emit,
  newPipe,
  nextCertNumber,
  recountBatch,
  refreshBatch,
  certFileName,
} from './engine';
import type { BatchRec, CertRec, DB, EventRec, JobRec, MemberRec, OrgRec, Role, TemplateRec, UserRec } from './types';
import { DAY, HOUR, MIN, newToken, uuid, ymd } from './util';

export const DEMO_EMAIL = 'organizer@certflow.app';
export const DEMO_PASSWORD = 'CertFlow@2026';

const el = (
  id: string,
  placeholder: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontStyle: string,
  colorHex: string,
  alignment = 'CENTER',
): TextElement => ({ id, placeholder, x, y, fontSize, fontFamily, fontStyle, colorHex, alignment });

/** The 'Executive Navy & Gold' preset of the TemplateBuilder. */
export function executiveLayout(title = 'CERTIFICATE OF EXCELLENCE', achievement?: string): LayoutConfig {
  return {
    orientation: 'LANDSCAPE',
    width: 842,
    height: 595,
    textElements: [
      el('org-name', '{{organization_name}}', 421, 85, 16, 'Helvetica', 'BOLD', '#64748B'),
      el('cert-title', title, 421, 135, 30, 'Times-Roman', 'BOLD', '#0F172A'),
      el('presented-to', 'THIS IS PROUDLY PRESENTED TO', 421, 185, 13, 'Helvetica', 'NORMAL', '#64748B'),
      el('participant-name', '{{participant_name}}', 421, 245, 34, 'Times-Roman', 'BOLD', '#1E3A8A'),
      el(
        'achievement',
        achievement ?? 'for exemplary participation and dedication as {{certificate_type}} in',
        421,
        295,
        14,
        'Helvetica',
        'NORMAL',
        '#334155',
      ),
      el('event-name', '{{event_name}}', 421, 335, 22, 'Helvetica', 'BOLD', '#0F172A'),
      el('issue-date', 'Issued on {{issue_date}}', 160, 475, 12, 'Helvetica', 'NORMAL', '#64748B'),
      el('cert-number', 'ID: {{certificate_number}}', 160, 495, 10, 'Courier', 'NORMAL', '#94A3B8'),
    ],
    qrCode: { enabled: true, x: 685, y: 430, size: 80 },
  };
}

interface Person {
  name: string;
  email: string;
  type: string;
}

const P = (name: string, email: string, type: string): Person => ({ name, email, type });

const BATCH1: Person[] = [
  P('Aarav Krishnan', 'aarav.krishnan@gmail.com', 'Winner'),
  P('Meera Subramanian', 'meera.subramanian@outlook.com', 'First Runner Up'),
  P('Rohit Menon', 'rohit.menon@gmail.com', 'Second Runner Up'),
  P('Anaya Iyer', 'ananya.iyer@gmail.com', 'Finalist'),
  P('Karthik Raman', 'karthik.raman@yahoo.com', 'Finalist'),
  P('Sneha Patel', 'sneha.patel@outlook.com', 'Finalist'),
  P('Vignesh Kumar', 'vignesh.kumar@gmail.com', 'Participant'),
  P('Divya Narayanan', 'divya.narayanan@gmail.com', 'Participant'),
  P('Arjun Reddy', 'arjun.reddy@outlook.com', 'Participant'),
  P('Pooja Venkatesh', 'pooja.venkatesh@gmail.com', 'Participant'),
  P('Harish Balaji', 'harish.balaji@gmail.com', 'Special Mention'),
  P('Lakshmi Priya', 'lakshmi.priya@yahoo.com', 'Participant'),
];
const BATCH2: Person[] = [
  P('Naveen Chandran', 'naveen.chandran@gmail.com', 'Attendee'),
  P('Shruthi Rajan', 'shruthi.rajan@outlook.com', 'Attendee'),
  P('Dinesh Babu', 'dinesh.babu@gmail.com', 'Attendee'),
  P('Priyanka Sharma', 'priyanka.sharma@gmail.com', 'Attendee'),
  P('Gowtham Selvam', 'gowtham.selvam@yahoo.com', 'Attendee'),
  P('Nithya Ramesh', 'nithya.ramesh@gmail.com', 'Attendee'),
  P('Surya Prakash', 'surya.prakash@outlook.com', 'Attendee'),
  P('Kavya Mohan', 'kavya.mohan@gmail.com', 'Attendee'),
  P('Ibrahim Khan', 'ibrahim.khan@gmail.com', 'Attendee'),
  P('Deepika Anand', 'deepika.anand@outlook.com', 'Attendee'),
];
const BATCH3: Person[] = [
  P('Team Quantum Leap', 'quantum.leap@gmail.com', 'Selected for Grand Finale'),
  P('Team Byte Force', 'byte.force@outlook.com', 'Selected for Grand Finale'),
  P('Team Pixel Pirates', 'pixel.pirates@gmail.com', 'Internal Round Winner'),
  P('Team CodeCrafters', 'code.crafters@gmail.com', 'Internal Round Runner Up'),
  P('Team Neural Nomads', 'neural.nomads@yahoo.com', 'Participant'),
  P('Team Stack Overflowers', 'stack.overflowers@gmail.com', 'Participant'),
  P('Team Binary Bandits', 'binary.bandits@outlook.com', 'Participant'),
  P('Team Syntax Error', 'syntax.error@gmail.com', 'Participant'),
];

export function buildSeed(now: number = Date.now()): DB {
  const db: DB = {
    v: 1,
    seq: { cert: 127 },
    users: {},
    orgs: {},
    members: [],
    sessions: {},
    pendingRegs: {},
    pendingResets: {},
    events: {},
    templates: {},
    batches: {},
    jobs: {},
    outbox: [],
    certs: {},
    emailAttempts: [],
    audit: [],
    pipes: {},
  };

  /* ---------- users / org ---------- */
  const mkUser = (email: string, fullName: string): UserRec => {
    const u: UserRec = { id: uuid(), email, fullName, password: DEMO_PASSWORD, createdAt: now - 60 * DAY };
    db.users[u.id] = u;
    return u;
  };
  const owner = mkUser(DEMO_EMAIL, 'Priya Nair');
  const admin = mkUser('meena.admin@certflow.dev', 'Meena Krishnan');
  const operator = mkUser('karthik.operator@certflow.dev', 'Karthik Raja');
  const viewer = mkUser('divya.viewer@certflow.dev', 'Divya Lakshmi');

  const org: OrgRec = {
    id: uuid(),
    name: 'Easwari Engineering College',
    slug: 'easwari-engineering-college',
    createdAt: now - 58 * DAY,
  };
  db.orgs[org.id] = org;
  const addMem = (u: UserRec, role: Role, daysAgo: number): MemberRec => {
    const m: MemberRec = { id: uuid(), orgId: org.id, userId: u.id, role, createdAt: now - daysAgo * DAY };
    db.members.push(m);
    return m;
  };
  addMem(owner, 'OWNER', 58);
  addMem(admin, 'ADMIN', 41);
  addMem(operator, 'OPERATOR', 30);
  addMem(viewer, 'VIEWER', 12);

  const pipe = newPipe(org.id);
  db.pipes[org.id] = pipe;

  /* ---------- events + templates ---------- */
  const mkEvent = (name: string, description: string, daysAgo: number): EventRec => {
    const e: EventRec = {
      id: uuid(),
      orgId: org.id,
      name,
      description,
      eventDate: ymd(now - daysAgo * DAY),
      archived: false,
      createdAt: now - (daysAgo + 10) * DAY,
      updatedAt: now - (daysAgo + 2) * DAY,
    };
    db.events[e.id] = e;
    return e;
  };
  const mkTpl = (ev: EventRec, name: string, layout: LayoutConfig, daysAgo: number, version = 1): TemplateRec => {
    const t: TemplateRec = {
      id: uuid(),
      eventId: ev.id,
      orgId: org.id,
      name,
      version,
      layoutConfig: layout,
      orientation: layout.orientation,
      width: layout.width,
      height: layout.height,
      backgroundDataUrl: null,
      createdAt: now - daysAgo * DAY,
      updatedAt: now - daysAgo * DAY,
    };
    db.templates[t.id] = t;
    return t;
  };

  const evAI = mkEvent('National AI Hackathon 2026', '24-hour national level hackathon on applied AI, hosted by the Department of AI & DS.', 9);
  const evCloud = mkEvent('Cloud Native Workshop', 'Hands-on two day workshop on Kubernetes, CI/CD and observability.', 3);
  const evSih = mkEvent('Smart India Hackathon Internal Round', 'College level screening round for Smart India Hackathon problem statements.', 20);

  const tplAI = mkTpl(evAI, 'Executive Navy & Gold', executiveLayout('CERTIFICATE OF EXCELLENCE'), 11, 2);
  const tplCloud = mkTpl(
    evCloud,
    'Executive Navy & Gold',
    executiveLayout('CERTIFICATE OF COMPLETION', 'for successfully completing the hands-on workshop as {{certificate_type}} of'),
    4,
  );
  const tplSih = mkTpl(
    evSih,
    'Executive Navy & Gold',
    executiveLayout('CERTIFICATE OF PARTICIPATION', 'in recognition of outstanding effort as {{certificate_type}} in'),
    22,
  );

  /* ---------- batches / jobs / certs ---------- */
  interface Opts {
    createdAt: number;
    failedIdx?: number[];
    pendingIdx?: number[];
    revokedIdx?: number[];
    replacedIdx?: number[];
  }
  const seedBatch = (name: string, ev: EventRec, tpl: TemplateRec, people: Person[], o: Opts): { batch: BatchRec; certs: CertRec[] } => {
    const b: BatchRec = {
      id: uuid(),
      orgId: org.id,
      eventId: ev.id,
      templateId: tpl.id,
      name,
      status: 'COMPLETED',
      participants: people.map((p) => ({ name: p.name, email: p.email, type: p.type })),
      total: people.length,
      generated: 0,
      emailSent: 0,
      failed: 0,
      cancelled: 0,
      createdAt: o.createdAt,
      startedAt: o.createdAt + 30_000,
      completedAt: null,
    };
    db.batches[b.id] = b;
    const certs: CertRec[] = [];
    people.forEach((p, i) => {
      const at = o.createdAt + 45_000 + i * 6_000;
      const certId = uuid();
      const pending = o.pendingIdx?.includes(i);
      const failed = o.failedIdx?.includes(i);
      const job: JobRec = {
        id: uuid(),
        orgId: org.id,
        batchId: b.id,
        eventId: ev.id,
        templateId: tpl.id,
        participantName: p.name,
        email: p.email,
        certificateType: p.type,
        status: 'GENERATED',
        emailStatus: pending ? 'PENDING' : failed ? 'FAILED' : 'SENT',
        attemptCount: pending ? 2 : failed ? 1 : 1,
        errorMessage: pending
          ? '421 4.7.0 Temporary SMTP failure, try again later'
          : failed
            ? '550 5.1.1 Recipient address rejected: mailbox unavailable'
            : null,
        lockedBy: `pdf-worker-${(i % 3) + 1}`,
        certificateId: certId,
        createdAt: o.createdAt + 30_000,
        updatedAt: at,
      };
      db.jobs[job.id] = job;
      const cert: CertRec = {
        id: certId,
        orgId: org.id,
        eventId: ev.id,
        templateId: tpl.id,
        batchId: b.id,
        jobId: job.id,
        certificateType: p.type,
        participantName: p.name,
        recipientEmail: p.email,
        certificateNumber: nextCertNumber(db, at),
        verificationToken: newToken(),
        status: 'ISSUED',
        emailStatus: job.emailStatus,
        emailErrorMessage: failed ? job.errorMessage : null,
        counted: pending ? null : failed ? 'FAILED' : 'SENT',
        replacementForId: null,
        replacedById: null,
        revocationReason: null,
        revokedAt: null,
        issuedAt: at,
        createdAt: at,
      };
      db.certs[cert.id] = cert;
      certs.push(cert);
    });
    b.generated = people.length;
    recountBatch(db, b);
    return { batch: b, certs };
  };

  const b1 = seedBatch('Finalists & Winners', evAI, tplAI, BATCH1, { createdAt: now - 2 * DAY, failedIdx: [10] });
  const b2 = seedBatch('Workshop Attendees', evCloud, tplCloud, BATCH2, { createdAt: now - 40 * MIN, pendingIdx: [4, 8] });
  const b3 = seedBatch('Round 1 Teams', evSih, tplSih, BATCH3, { createdAt: now - 5 * HOUR });

  // pending retries for batch 2 (earlier transient SMTP failures)
  for (const [k, idx] of [4, 8].entries()) {
    pipe.retries.push({ certId: b2.certs[idx].id, attempts: 2, dueAt: now + 6_000 + k * 5_000 });
  }

  // REVOKED
  const revoked = b1.certs[7];
  revoked.status = 'REVOKED';
  revoked.revocationReason = 'Disqualified: plagiarism found in the project submission';
  revoked.revokedAt = now - 26 * HOUR;

  // REPLACED (name misspelled) + replacement
  const orig = b1.certs[3];
  const repAt = now - 30 * HOUR;
  const repl: CertRec = {
    id: uuid(),
    orgId: org.id,
    eventId: evAI.id,
    templateId: tplAI.id,
    batchId: null,
    jobId: null,
    certificateType: orig.certificateType,
    participantName: 'Ananya Iyer',
    recipientEmail: orig.recipientEmail,
    certificateNumber: nextCertNumber(db, repAt),
    verificationToken: newToken(),
    status: 'ISSUED',
    emailStatus: 'SENT',
    emailErrorMessage: null,
    counted: null,
    replacementForId: orig.id,
    replacedById: null,
    revocationReason: null,
    revokedAt: null,
    issuedAt: repAt,
    createdAt: repAt,
  };
  db.certs[repl.id] = repl;
  orig.status = 'REPLACED';
  orig.replacedById = repl.id;
  orig.revocationReason = 'Participant name was misspelled on the original certificate';
  orig.revokedAt = repAt;

  for (const b of [b1.batch, b2.batch, b3.batch]) refreshBatch(db, b, now);
  b1.batch.completedAt = b1.batch.createdAt + 45_000 + BATCH1.length * 6_000 + 10_000;
  b3.batch.completedAt = b3.batch.createdAt + 45_000 + BATCH3.length * 6_000 + 10_000;

  // DLQ entry for the permanently failed delivery
  const failedCert = b1.certs[10];
  pipe.dlq.push({
    id: uuid(),
    certificateId: failedCert.id,
    participantName: failedCert.participantName,
    recipientEmail: failedCert.recipientEmail,
    reason: failedCert.emailErrorMessage ?? '550 5.1.1 Recipient address rejected: mailbox unavailable',
    attempts: 1,
    at: failedCert.issuedAt + 4_000,
  });

  /* ---------- pipeline telemetry ---------- */
  const total = BATCH1.length + BATCH2.length + BATCH3.length;
  pipe.outboxPublished = total;
  pipe.jobsProduced = total + 4;
  pipe.jobsConsumed = total + 4;
  pipe.genProduced = total + 1;
  pipe.genConsumed = total + 1 - 2;
  pipe.dlqReplayed = 0;
  pipe.publisherLastPublishedAt = b2.batch.createdAt + 31_000;
  pipe.counters = {
    duplicateClaimsDropped: 4,
    retriesScheduled: 9,
    dlqTotal: 1,
    cacheHits: 128,
    cacheMisses: 31,
    cacheEvictions: 2,
  };
  const procs = [11, 10, 9, 14, 13];
  pipe.workers.forEach((w, i) => (w.processed = procs[i] + (i < 3 ? 0 : 2)));

  const sentCerts = [...b1.certs, ...b2.certs, ...b3.certs, repl].filter((c) => c.emailStatus === 'SENT');
  sentCerts.sort((a, b) => b.issuedAt - a.issuedAt);
  pipe.mailbox = sentCerts.slice(0, 12).map((c) => ({
    id: uuid(),
    at: c.issuedAt + 2_500,
    to: c.recipientEmail,
    subject: `Your certificate for ${db.events[c.eventId].name}`,
    certificateId: c.id,
    attachmentName: certFileName(c),
  }));

  // event log (newest first after emit ordering)
  const evs: { ago: number; kind: Parameters<typeof emit>[1]; msg: string }[] = [];
  const last = b2.certs;
  evs.push({ ago: 38 * MIN, kind: 'OUTBOX', msg: `Batch "Workshop Attendees": ${BATCH2.length} jobs + ${BATCH2.length} outbox rows committed in one transaction (first: ${BATCH2[0].name})` });
  evs.push({ ago: 38 * MIN - 1_000, kind: 'PUBLISH', msg: `Outbox publisher sent ${BATCH2.length} job message(s) to certflow.certificate.jobs: ${BATCH2[0].name}, ${BATCH2[1].name} +${BATCH2.length - 2} more` });
  evs.push({ ago: 37 * MIN, kind: 'CLAIM', msg: `pdf-worker-2 claimed job for ${BATCH2[1].name} (QUEUED -> PROCESSING)` });
  evs.push({ ago: 37 * MIN - 3_000, kind: 'DUPLICATE_DROPPED', msg: `pdf-worker-3 lost the claim for ${BATCH2[1].name} (job already PROCESSING by pdf-worker-2); duplicate dropped` });
  evs.push({ ago: 36 * MIN, kind: 'RENDER', msg: `pdf-worker-2 rendered PDF ${last[1].certificateNumber} for ${BATCH2[1].name} (${evCloud.name})` });
  evs.push({ ago: 36 * MIN - 1_000, kind: 'STORE', msg: `Stored ${last[1].certificateNumber}; produced certflow.certificate.generated for ${BATCH2[1].name}` });
  evs.push({ ago: 35 * MIN, kind: 'EMAIL_SENT', msg: `email-worker-1 delivered ${last[1].certificateNumber} to ${BATCH2[1].name} <${BATCH2[1].email}>` });
  evs.push({ ago: 34 * MIN, kind: 'RETRY', msg: `SMTP 421 for ${BATCH2[4].name} (${last[4].certificateNumber}); retry 1/3 in 1.2s` });
  evs.push({ ago: 33 * MIN, kind: 'RETRY', msg: `SMTP 421 for ${BATCH2[4].name} (${last[4].certificateNumber}); retry 2/3 in 2.3s` });
  evs.push({ ago: 33 * MIN - 2_000, kind: 'RETRY', msg: `SMTP 421 for ${BATCH2[8].name} (${last[8].certificateNumber}); retry 1/3 in 1.1s` });
  evs.push({ ago: 20 * MIN, kind: 'CACHE_MISS', msg: `Verification of ${last[0].certificateNumber} read from PostgreSQL, cached for 1h` });
  evs.push({ ago: 19 * MIN, kind: 'CACHE_HIT', msg: `Verification of ${last[0].certificateNumber} served from Redis cache` });
  evs.push({ ago: 12 * MIN, kind: 'CACHE_HIT', msg: `Verification of ${b3.certs[2].certificateNumber} served from Redis cache` });
  evs.push({ ago: 26 * HOUR, kind: 'REVOKE', msg: `Certificate ${revoked.certificateNumber} (${revoked.participantName}) revoked: ${revoked.revocationReason}` });
  evs.push({ ago: 26 * HOUR - 500, kind: 'EVICT', msg: `Evicted cache key for ${revoked.certificateNumber} (${revoked.participantName})` });
  evs.push({ ago: 2 * DAY - 2 * MIN, kind: 'DLQ', msg: `${failedCert.certificateNumber} for ${failedCert.participantName} moved to certflow.dlq: ${pipe.dlq[0].reason}` });
  evs.sort((a, b) => a.ago - b.ago);
  // emit() unshifts, so feed oldest first
  for (const e of [...evs].reverse()) emit(pipe, e.kind, e.msg, now - e.ago);

  /* ---------- audit trail ---------- */
  const au = (ago: number, u: UserRec, action: string, type: string, id: string | null, d: Record<string, unknown>) =>
    addAudit(db, org.id, u.id, action, type, id, d, now - ago);
  au(58 * DAY, owner, 'ORGANIZATION_CREATED', 'ORGANIZATION', org.id, { name: org.name });
  au(41 * DAY, owner, 'MEMBER_ADDED', 'MEMBER', admin.id, { email: admin.email, role: 'ADMIN' });
  au(30 * DAY, owner, 'MEMBER_ADDED', 'MEMBER', operator.id, { email: operator.email, role: 'OPERATOR' });
  au(22 * DAY, admin, 'EVENT_CREATED', 'EVENT', evSih.id, { name: evSih.name });
  au(22 * DAY - HOUR, admin, 'TEMPLATE_SAVED', 'TEMPLATE', tplSih.id, { name: tplSih.name, version: 1 });
  au(11 * DAY, admin, 'EVENT_CREATED', 'EVENT', evAI.id, { name: evAI.name });
  au(11 * DAY - HOUR, admin, 'TEMPLATE_SAVED', 'TEMPLATE', tplAI.id, { name: tplAI.name, version: 2 });
  au(5 * HOUR, operator, 'BATCH_STARTED', 'BATCH', b3.batch.id, { name: b3.batch.name, participants: BATCH3.length });
  au(30 * HOUR, admin, 'CERTIFICATE_REPLACED', 'CERTIFICATE', orig.id, { from: orig.certificateNumber, to: repl.certificateNumber, reason: orig.revocationReason });
  au(26 * HOUR, admin, 'CERTIFICATE_REVOKED', 'CERTIFICATE', revoked.id, { certificateNumber: revoked.certificateNumber, reason: revoked.revocationReason });
  au(2 * DAY, operator, 'BATCH_STARTED', 'BATCH', b1.batch.id, { name: b1.batch.name, participants: BATCH1.length });
  au(12 * DAY, owner, 'MEMBER_ADDED', 'MEMBER', viewer.id, { email: viewer.email, role: 'VIEWER' });
  au(4 * DAY, admin, 'EVENT_CREATED', 'EVENT', evCloud.id, { name: evCloud.name });
  au(40 * MIN, operator, 'BATCH_STARTED', 'BATCH', b2.batch.id, { name: b2.batch.name, participants: BATCH2.length });
  au(8 * MIN, operator, 'CERTIFICATE_RESENT', 'CERTIFICATE', b2.certs[4].id, { certificateNumber: b2.certs[4].certificateNumber });
  db.audit.sort((a, b) => b.createdAt - a.createdAt);

  // warm cache for a few valid tokens
  for (const c of [b2.certs[0], b3.certs[2], b1.certs[0]]) pipe.cache[c.verificationToken] = now + 40 * MIN;

  return db;
}
