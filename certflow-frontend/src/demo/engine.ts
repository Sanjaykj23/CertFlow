/**
 * Pipeline simulation engine. Dramatises the CertFlow architecture:
 *   transactional outbox -> publisher -> topic(jobs) -> PDF workers (atomic claim)
 *   -> topic(generated) -> email workers (retry/backoff) -> DLQ, plus a
 *   verification cache that is evicted on revoke/replace.
 * Pure data-in/data-out over the DB object; no DOM access, runs under Node.
 */
import type {
  BatchRec,
  CertRec,
  DB,
  Pipe,
  PipeEventKind,
  WorkerRec,
} from './types';
import { HOUR, newToken, rand, uuid } from './util';

export const TOPIC_JOBS = 'certflow.certificate.jobs';
export const TOPIC_GENERATED = 'certflow.certificate.generated';
export const TOPIC_DLQ = 'certflow.dlq';
export const MAX_EMAIL_ATTEMPTS = 4;
export const CACHE_TTL_MS = HOUR;
const BOUNCE_DOMAINS = ['bounce.test', 'invalid.test'];
const EVENT_CAP = 60;
const MAILBOX_CAP = 50;

/* ------------------------------------------------------------------ */
/* Pipe state                                                          */
/* ------------------------------------------------------------------ */

export function newWorkers(): WorkerRec[] {
  const mk = (id: string, type: 'PDF' | 'EMAIL'): WorkerRec => ({
    id,
    type,
    processed: 0,
    busyUntil: 0,
    taskId: null,
    taskAttempts: 0,
    taskLabel: null,
  });
  return [
    mk('pdf-worker-1', 'PDF'),
    mk('pdf-worker-2', 'PDF'),
    mk('pdf-worker-3', 'PDF'),
    mk('email-worker-1', 'EMAIL'),
    mk('email-worker-2', 'EMAIL'),
  ];
}

export function newPipe(orgId: string): Pipe {
  return {
    orgId,
    publisherLastTickAt: 0,
    publisherLastPublishedAt: null,
    outboxPublished: 0,
    outboxFailed: 0,
    jobsQueue: [],
    genQueue: [],
    retries: [],
    jobsProduced: 0,
    jobsConsumed: 0,
    genProduced: 0,
    genConsumed: 0,
    dlqReplayed: 0,
    workers: newWorkers(),
    counters: {
      duplicateClaimsDropped: 0,
      retriesScheduled: 0,
      dlqTotal: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheEvictions: 0,
    },
    chaos: { smtpMode: 'NONE', publisherDown: false, duplicateDelivery: false },
    dlq: [],
    events: [],
    mailbox: [],
    cache: {},
  };
}

export function pipeOf(db: DB, orgId: string): Pipe {
  let p = db.pipes[orgId];
  if (!p) {
    p = newPipe(orgId);
    db.pipes[orgId] = p;
  }
  return p;
}

export function emit(pipe: Pipe, kind: PipeEventKind, message: string, at: number = Date.now()): void {
  pipe.events.unshift({ id: uuid(), at, kind, message });
  if (pipe.events.length > EVENT_CAP) pipe.events.length = EVENT_CAP;
}

export function addAudit(
  db: DB,
  orgId: string,
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, unknown>,
  at: number = Date.now(),
): void {
  db.audit.unshift({
    id: uuid(),
    organizationId: orgId,
    userId,
    action,
    resourceType,
    resourceId,
    detailsJson: JSON.stringify(details),
    ipAddress: '127.0.0.1',
    createdAt: at,
  });
  if (db.audit.length > 1000) db.audit.length = 1000;
}

/* ------------------------------------------------------------------ */
/* Certificates                                                        */
/* ------------------------------------------------------------------ */

export function nextCertNumber(db: DB, at: number = Date.now()): string {
  db.seq.cert += 1;
  return `CF-${new Date(at).getFullYear()}-${String(db.seq.cert).padStart(6, '0')}`;
}

export function certFileName(c: Pick<CertRec, 'participantName' | 'certificateNumber'>): string {
  const safe = c.participantName.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Participant';
  return `Certificate_${safe}_${c.certificateNumber}.pdf`;
}

/* ------------------------------------------------------------------ */
/* Batch bookkeeping                                                   */
/* ------------------------------------------------------------------ */

export function refreshBatch(db: DB, b: BatchRec, now: number = Date.now()): void {
  if (b.status === 'DRAFT' || b.status === 'CANCELLED') return;
  const settledEmails = b.emailSent + b.failed;
  const pdfDone = b.generated + b.cancelled >= b.total;
  if (pdfDone && settledEmails >= b.generated) {
    b.status = b.failed === 0 ? 'COMPLETED' : b.emailSent === 0 && b.failed >= b.total ? 'FAILED' : 'PARTIALLY_FAILED';
    if (!b.completedAt) b.completedAt = now;
  } else {
    b.completedAt = null;
    if (b.status === 'COMPLETED' || b.status === 'PARTIALLY_FAILED' || b.status === 'FAILED') b.status = 'PROCESSING';
  }
}

/** Idempotently records the final delivery outcome of a certificate in its batch counters. */
export function setEmailOutcome(db: DB, cert: CertRec, outcome: 'SENT' | 'FAILED' | null, now: number = Date.now()): void {
  if (cert.counted === outcome) return;
  const b = cert.batchId ? db.batches[cert.batchId] : null;
  if (b) {
    if (cert.counted === 'SENT') b.emailSent = Math.max(0, b.emailSent - 1);
    if (cert.counted === 'FAILED') b.failed = Math.max(0, b.failed - 1);
    if (outcome === 'SENT') b.emailSent += 1;
    if (outcome === 'FAILED') b.failed += 1;
  }
  cert.counted = outcome;
  if (b) refreshBatch(db, b, now);
}

export function recountBatch(db: DB, b: BatchRec): void {
  let generated = 0;
  let sent = 0;
  let failed = 0;
  let cancelled = 0;
  for (const j of Object.values(db.jobs)) {
    if (j.batchId !== b.id) continue;
    if (j.status === 'GENERATED') generated++;
    if (j.status === 'CANCELLED') cancelled++;
    const c = j.certificateId ? db.certs[j.certificateId] : null;
    if (c && c.counted === 'SENT') sent++;
    if (c && c.counted === 'FAILED') failed++;
  }
  b.generated = generated;
  b.emailSent = sent;
  b.failed = failed;
  b.cancelled = cancelled;
}

/* ------------------------------------------------------------------ */
/* Starting / cancelling a batch                                       */
/* ------------------------------------------------------------------ */

/** ONE "transaction": a QUEUED job and a PENDING outbox row per participant, batch -> QUEUED. */
export function startBatch(db: DB, b: BatchRec, now: number = Date.now()): void {
  const pipe = pipeOf(db, b.orgId);
  for (const p of b.participants) {
    const job = {
      id: uuid(),
      orgId: b.orgId,
      batchId: b.id,
      eventId: b.eventId,
      templateId: b.templateId,
      participantName: p.name,
      email: p.email,
      certificateType: p.type,
      status: 'QUEUED' as const,
      emailStatus: 'PENDING' as const,
      attemptCount: 0,
      errorMessage: null,
      lockedBy: null,
      certificateId: null,
      createdAt: now,
      updatedAt: now,
    };
    db.jobs[job.id] = job;
    db.outbox.push({ id: uuid(), orgId: b.orgId, jobId: job.id, createdAt: now });
  }
  b.status = 'QUEUED';
  b.startedAt = now;
  b.completedAt = null;
  b.generated = 0;
  b.emailSent = 0;
  b.failed = 0;
  b.cancelled = 0;
  const first = b.participants[0]?.name ?? 'participants';
  emit(
    pipe,
    'OUTBOX',
    `Batch "${b.name}": ${b.participants.length} jobs + ${b.participants.length} outbox rows committed in one transaction (first: ${first})`,
    now,
  );
}

export function cancelBatch(db: DB, b: BatchRec, now: number = Date.now()): void {
  const pipe = pipeOf(db, b.orgId);
  let n = 0;
  for (const j of Object.values(db.jobs)) {
    if (j.batchId === b.id && j.status === 'QUEUED') {
      j.status = 'CANCELLED';
      j.updatedAt = now;
      n++;
    }
  }
  db.outbox = db.outbox.filter((r) => db.jobs[r.jobId]?.batchId !== b.id);
  b.cancelled += n;
  b.status = 'CANCELLED';
  b.completedAt = now;
  emit(pipe, 'OUTBOX', `Batch "${b.name}" cancelled: ${n} queued job(s) withdrawn`, now);
}

/* ------------------------------------------------------------------ */
/* Delivery helpers (resend / replay)                                  */
/* ------------------------------------------------------------------ */

/** Re-queues email delivery for a certificate through the email workers. */
export function requeueEmail(db: DB, cert: CertRec, why: string, now: number = Date.now()): void {
  const pipe = pipeOf(db, cert.orgId);
  // drop pending retries / DLQ entries for this certificate, they are superseded
  pipe.retries = pipe.retries.filter((r) => r.certId !== cert.id);
  const dlqBefore = pipe.dlq.length;
  pipe.dlq = pipe.dlq.filter((d) => d.certificateId !== cert.id);
  if (pipe.dlq.length !== dlqBefore) pipe.dlqReplayed += dlqBefore - pipe.dlq.length;
  setEmailOutcome(db, cert, null, now);
  cert.emailStatus = 'PENDING';
  cert.emailErrorMessage = null;
  if (cert.jobId && db.jobs[cert.jobId]) {
    const j = db.jobs[cert.jobId];
    j.emailStatus = 'PENDING';
    j.errorMessage = null;
    j.updatedAt = now;
  }
  pipe.genQueue.push({ certId: cert.id, attempts: 0 });
  pipe.genProduced += 1;
  emit(pipe, 'PUBLISH', `${why}: ${cert.certificateNumber} (${cert.participantName}) -> ${TOPIC_GENERATED}`, now);
}

export function replayDlq(db: DB, orgId: string, dlqId: string, now: number = Date.now()): boolean {
  const pipe = pipeOf(db, orgId);
  const entry = pipe.dlq.find((d) => d.id === dlqId);
  if (!entry) return false;
  const cert = db.certs[entry.certificateId];
  pipe.dlq = pipe.dlq.filter((d) => d.id !== dlqId);
  pipe.dlqReplayed += 1;
  if (cert && cert.status === 'ISSUED') {
    requeueEmail(db, cert, 'DLQ replay', now);
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Verification cache                                                  */
/* ------------------------------------------------------------------ */

export function cacheLookup(db: DB, cert: CertRec, now: number = Date.now()): 'HIT' | 'MISS' {
  const pipe = pipeOf(db, cert.orgId);
  const exp = pipe.cache[cert.verificationToken];
  if (exp && exp > now) {
    pipe.counters.cacheHits++;
    emit(pipe, 'CACHE_HIT', `Verification of ${cert.certificateNumber} served from Redis cache`, now);
    return 'HIT';
  }
  pipe.counters.cacheMisses++;
  emit(pipe, 'CACHE_MISS', `Verification of ${cert.certificateNumber} read from PostgreSQL, cached for 1h`, now);
  if (cert.status === 'ISSUED') pipe.cache[cert.verificationToken] = now + CACHE_TTL_MS;
  else delete pipe.cache[cert.verificationToken];
  return 'MISS';
}

export function cacheEvict(db: DB, cert: CertRec, now: number = Date.now()): void {
  const pipe = pipeOf(db, cert.orgId);
  delete pipe.cache[cert.verificationToken];
  pipe.counters.cacheEvictions++;
  emit(pipe, 'EVICT', `Evicted cache key for ${cert.certificateNumber} (${cert.participantName})`, now);
}

/* ------------------------------------------------------------------ */
/* Ticker body                                                         */
/* ------------------------------------------------------------------ */

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

function runPublisher(db: DB, pipe: Pipe, now: number): boolean {
  if (now - pipe.publisherLastTickAt < 1000) return false;
  pipe.publisherLastTickAt = now;
  if (pipe.chaos.publisherDown) return false;
  const rows: typeof db.outbox = [];
  const rest: typeof db.outbox = [];
  for (const r of db.outbox) {
    if (r.orgId === pipe.orgId && rows.length < 100) rows.push(r);
    else rest.push(r);
  }
  if (!rows.length) return false;
  db.outbox = rest;
  const names: string[] = [];
  for (const r of rows) {
    const job = db.jobs[r.jobId];
    if (!job) continue;
    pipe.jobsQueue.push({ jobId: job.id, dup: false });
    if (pipe.chaos.duplicateDelivery) pipe.jobsQueue.push({ jobId: job.id, dup: true });
    pipe.jobsProduced += 1;
    pipe.outboxPublished += 1;
    if (names.length < 2) names.push(job.participantName);
  }
  pipe.publisherLastPublishedAt = now;
  const more = rows.length > names.length ? ` +${rows.length - names.length} more` : '';
  emit(
    pipe,
    'PUBLISH',
    `Outbox publisher sent ${rows.length} job message(s) to ${TOPIC_JOBS}: ${names.join(', ')}${more}${
      pipe.chaos.duplicateDelivery ? ' (each delivered twice)' : ''
    }`,
    now,
  );
  return true;
}

function runPdfWorker(db: DB, pipe: Pipe, w: WorkerRec, now: number): boolean {
  let changed = false;
  if (w.taskId && now >= w.busyUntil) {
    changed = true;
    const job = db.jobs[w.taskId];
    w.taskId = null;
    w.taskLabel = null;
    w.processed += 1;
    if (job && job.status === 'PROCESSING') {
      const tpl = db.templates[job.templateId];
      const ev = db.events[job.eventId];
      const cert: CertRec = {
        id: uuid(),
        orgId: job.orgId,
        eventId: job.eventId,
        templateId: tpl ? tpl.id : job.templateId,
        batchId: job.batchId,
        jobId: job.id,
        certificateType: job.certificateType,
        participantName: job.participantName,
        recipientEmail: job.email,
        certificateNumber: nextCertNumber(db, now),
        verificationToken: newToken(),
        status: 'ISSUED',
        emailStatus: 'PENDING',
        emailErrorMessage: null,
        counted: null,
        replacementForId: null,
        replacedById: null,
        revocationReason: null,
        revokedAt: null,
        issuedAt: now,
        createdAt: now,
      };
      db.certs[cert.id] = cert;
      job.status = 'GENERATED';
      job.certificateId = cert.id;
      job.lockedBy = null;
      job.updatedAt = now;
      const b = db.batches[job.batchId];
      if (b) {
        b.generated += 1;
        refreshBatch(db, b, now);
      }
      emit(pipe, 'RENDER', `${w.id} rendered PDF ${cert.certificateNumber} for ${job.participantName} (${ev?.name ?? 'event'})`, now);
      emit(pipe, 'STORE', `Stored ${cert.certificateNumber}; produced ${TOPIC_GENERATED} for ${job.participantName}`, now);
      pipe.genQueue.push({ certId: cert.id, attempts: 0 });
      pipe.genProduced += 1;
    }
  }
  if (!w.taskId) {
    let guard = 0;
    while (pipe.jobsQueue.length && guard++ < 20) {
      const msg = pipe.jobsQueue.shift()!;
      pipe.jobsConsumed += 1;
      const job = db.jobs[msg.jobId];
      if (!job || job.status === 'CANCELLED') continue;
      // ATOMIC CLAIM BARRIER: UPDATE jobs SET status='PROCESSING', locked_by=? WHERE id=? AND status='QUEUED'
      if (job.status !== 'QUEUED') {
        pipe.counters.duplicateClaimsDropped += 1;
        emit(
          pipe,
          'DUPLICATE_DROPPED',
          `${w.id} lost the claim for ${job.participantName} (job already ${job.status} by ${job.lockedBy ?? 'a worker'}); duplicate dropped`,
          now,
        );
        changed = true;
        continue;
      }
      job.status = 'PROCESSING';
      job.lockedBy = w.id;
      job.updatedAt = now;
      const b = db.batches[job.batchId];
      if (b && b.status === 'QUEUED') b.status = 'PROCESSING';
      w.taskId = job.id;
      w.taskLabel = `Rendering PDF for ${job.participantName}`;
      w.busyUntil = now + rand(700, 1500);
      emit(pipe, 'CLAIM', `${w.id} claimed job for ${job.participantName} (QUEUED -> PROCESSING)`, now);
      changed = true;
      break;
    }
  }
  return changed;
}

function failEmail(db: DB, pipe: Pipe, cert: CertRec, attempts: number, reason: string, now: number): void {
  const entry = {
    id: uuid(),
    certificateId: cert.id,
    participantName: cert.participantName,
    recipientEmail: cert.recipientEmail,
    reason,
    attempts,
    at: now,
  };
  pipe.dlq.unshift(entry);
  if (pipe.dlq.length > 100) pipe.dlq.length = 100;
  pipe.counters.dlqTotal += 1;
  cert.emailStatus = 'FAILED';
  cert.emailErrorMessage = reason;
  const j = cert.jobId ? db.jobs[cert.jobId] : null;
  if (j) {
    j.emailStatus = 'FAILED';
    j.errorMessage = reason;
    j.attemptCount = attempts;
    j.updatedAt = now;
  }
  setEmailOutcome(db, cert, 'FAILED', now);
  emit(pipe, 'DLQ', `${cert.certificateNumber} for ${cert.participantName} moved to ${TOPIC_DLQ}: ${reason}`, now);
}

function runEmailWorker(db: DB, pipe: Pipe, w: WorkerRec, now: number): boolean {
  let changed = false;
  if (w.taskId && now >= w.busyUntil) {
    changed = true;
    const cert = db.certs[w.taskId];
    const attempt = w.taskAttempts + 1;
    w.taskId = null;
    w.taskLabel = null;
    w.processed += 1;
    if (cert && cert.status === 'ISSUED') {
      const job = cert.jobId ? db.jobs[cert.jobId] : null;
      if (job) {
        job.attemptCount = Math.max(job.attemptCount, attempt);
        job.updatedAt = now;
      }
      const permanent = pipe.chaos.smtpMode === 'PERMANENT' || BOUNCE_DOMAINS.includes(domainOf(cert.recipientEmail));
      const transient = pipe.chaos.smtpMode === 'TRANSIENT' && attempt <= 2;
      if (permanent) {
        const reason = `550 5.1.1 <${cert.recipientEmail}>: Recipient address rejected: user unknown`;
        db.emailAttempts.push({ id: uuid(), certId: cert.id, attempt, status: 'FAILED', error: reason, at: now });
        failEmail(db, pipe, cert, attempt, reason, now);
      } else if (transient) {
        const reason = '421 4.7.0 Temporary SMTP failure, try again later';
        db.emailAttempts.push({ id: uuid(), certId: cert.id, attempt, status: 'RETRY', error: reason, at: now });
        if (attempt >= MAX_EMAIL_ATTEMPTS) {
          failEmail(db, pipe, cert, attempt, `Retries exhausted after ${attempt} attempts: ${reason}`, now);
        } else {
          const delay = Math.min(8000, 1000 * 2 ** (attempt - 1)) + rand(0, 400);
          pipe.retries.push({ certId: cert.id, attempts: attempt, dueAt: now + delay });
          pipe.counters.retriesScheduled += 1;
          if (job) job.errorMessage = reason;
          emit(
            pipe,
            'RETRY',
            `SMTP ${reason.slice(0, 3)} for ${cert.participantName} (${cert.certificateNumber}); retry ${attempt}/${MAX_EMAIL_ATTEMPTS - 1} in ${(delay / 1000).toFixed(1)}s`,
            now,
          );
        }
      } else {
        db.emailAttempts.push({ id: uuid(), certId: cert.id, attempt, status: 'SENT', error: null, at: now });
        const ev = db.events[cert.eventId];
        cert.emailStatus = 'SENT';
        cert.emailErrorMessage = null;
        if (job) {
          job.emailStatus = 'SENT';
          job.errorMessage = null;
        }
        pipe.mailbox.unshift({
          id: uuid(),
          at: now,
          to: cert.recipientEmail,
          subject: `Your certificate for ${ev?.name ?? 'the event'}`,
          certificateId: cert.id,
          attachmentName: certFileName(cert),
        });
        if (pipe.mailbox.length > MAILBOX_CAP) pipe.mailbox.length = MAILBOX_CAP;
        setEmailOutcome(db, cert, 'SENT', now);
        emit(
          pipe,
          'EMAIL_SENT',
          `${w.id} delivered ${cert.certificateNumber} to ${cert.participantName} <${cert.recipientEmail}>${attempt > 1 ? ` on attempt ${attempt}` : ''}`,
          now,
        );
      }
      if (db.emailAttempts.length > 400) db.emailAttempts.splice(0, db.emailAttempts.length - 400);
    }
  }
  if (!w.taskId) {
    let next: { certId: string; attempts: number } | null = null;
    const dueIdx = pipe.retries.findIndex((r) => r.dueAt <= now);
    if (dueIdx >= 0) {
      const r = pipe.retries.splice(dueIdx, 1)[0];
      next = { certId: r.certId, attempts: r.attempts };
    } else {
      let guard = 0;
      while (pipe.genQueue.length && guard++ < 20) {
        const m = pipe.genQueue.shift()!;
        pipe.genConsumed += 1;
        const c = db.certs[m.certId];
        if (c && c.status === 'ISSUED') {
          next = m;
          break;
        }
      }
    }
    if (next) {
      const cert = db.certs[next.certId];
      if (cert && cert.status === 'ISSUED') {
        w.taskId = cert.id;
        w.taskAttempts = next.attempts;
        w.taskLabel = `Sending ${cert.certificateNumber} to ${cert.recipientEmail} (attempt ${next.attempts + 1})`;
        w.busyUntil = now + rand(400, 900);
        changed = true;
      }
    }
  }
  return changed;
}

let lastPrune = 0;

/** Advances every org's pipeline. Returns true when anything changed (caller persists). */
export function tick(db: DB, now: number = Date.now()): boolean {
  let changed = false;
  for (const pipe of Object.values(db.pipes)) {
    if (runPublisher(db, pipe, now)) changed = true;
    for (const w of pipe.workers) {
      if (w.type === 'PDF' ? runPdfWorker(db, pipe, w, now) : runEmailWorker(db, pipe, w, now)) changed = true;
    }
  }
  if (now - lastPrune > 60_000) {
    lastPrune = now;
    for (const pipe of Object.values(db.pipes)) {
      for (const [k, exp] of Object.entries(pipe.cache)) if (exp <= now) delete pipe.cache[k];
    }
  }
  return changed;
}

/** True while any pipeline still has work in flight (used to decide persistence cadence). */
export function hasWork(db: DB): boolean {
  if (db.outbox.length) return true;
  return Object.values(db.pipes).some(
    (p) => p.jobsQueue.length || p.genQueue.length || p.retries.length || p.workers.some((w) => w.taskId),
  );
}

