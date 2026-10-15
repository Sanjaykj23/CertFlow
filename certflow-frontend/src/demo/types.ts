/** Internal data model of the in-browser demo backend (persisted as one JSON document). */
import type { LayoutConfig } from '../lib/certificate';

export type Role = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
export type CertStatus = 'ISSUED' | 'REVOKED' | 'REPLACED';
export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'GENERATED' | 'FAILED' | 'CANCELLED';
export type BatchStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_FAILED'
  | 'FAILED'
  | 'CANCELLED';

export type PipeEventKind =
  | 'OUTBOX'
  | 'PUBLISH'
  | 'CLAIM'
  | 'DUPLICATE_DROPPED'
  | 'RENDER'
  | 'STORE'
  | 'EMAIL_SENT'
  | 'RETRY'
  | 'DLQ'
  | 'CACHE_HIT'
  | 'CACHE_MISS'
  | 'EVICT'
  | 'REVOKE';

export interface UserRec {
  id: string;
  email: string;
  fullName: string;
  password: string;
  createdAt: number;
}
export interface OrgRec {
  id: string;
  name: string;
  slug: string;
  createdAt: number;
}
export interface MemberRec {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
  createdAt: number;
}
export interface EventRec {
  id: string;
  orgId: string;
  name: string;
  description: string;
  eventDate: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}
export interface TemplateRec {
  id: string;
  eventId: string;
  orgId: string;
  name: string;
  version: number;
  layoutConfig: LayoutConfig;
  orientation: string;
  width: number;
  height: number;
  backgroundDataUrl: string | null;
  createdAt: number;
  updatedAt: number;
}
export interface ParticipantRec {
  name: string;
  email: string;
  type: string;
}
export interface BatchRec {
  id: string;
  orgId: string;
  eventId: string;
  templateId: string;
  name: string;
  status: BatchStatus;
  participants: ParticipantRec[];
  total: number;
  /** PDFs generated. */
  generated: number;
  /** Emails delivered. */
  emailSent: number;
  /** Emails permanently failed (DLQ). */
  failed: number;
  /** Jobs cancelled. */
  cancelled: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}
export interface JobRec {
  id: string;
  orgId: string;
  batchId: string;
  eventId: string;
  templateId: string;
  participantName: string;
  email: string;
  certificateType: string;
  status: JobStatus;
  emailStatus: EmailStatus;
  attemptCount: number;
  errorMessage: string | null;
  lockedBy: string | null;
  certificateId: string | null;
  createdAt: number;
  updatedAt: number;
}
export interface OutboxRow {
  id: string;
  orgId: string;
  jobId: string;
  createdAt: number;
}
export interface CertRec {
  id: string;
  orgId: string;
  eventId: string;
  templateId: string;
  batchId: string | null;
  jobId: string | null;
  certificateType: string;
  participantName: string;
  recipientEmail: string;
  certificateNumber: string;
  verificationToken: string;
  status: CertStatus;
  emailStatus: EmailStatus;
  emailErrorMessage: string | null;
  counted: 'SENT' | 'FAILED' | null;
  replacementForId: string | null;
  replacedById: string | null;
  revocationReason: string | null;
  revokedAt: number | null;
  issuedAt: number;
  createdAt: number;
}
export interface EmailAttemptRec {
  id: string;
  certId: string;
  attempt: number;
  status: 'SENT' | 'RETRY' | 'FAILED';
  error: string | null;
  at: number;
}
export interface AuditRec {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  detailsJson: string;
  ipAddress: string;
  createdAt: number;
}

export interface DlqEntry {
  id: string;
  certificateId: string;
  participantName: string;
  recipientEmail: string;
  reason: string;
  attempts: number;
  at: number;
}
export interface PipeEvent {
  id: string;
  at: number;
  kind: PipeEventKind;
  message: string;
}
export interface MailEntry {
  id: string;
  at: number;
  to: string;
  subject: string;
  certificateId: string;
  attachmentName: string;
}
export interface Chaos {
  smtpMode: 'NONE' | 'TRANSIENT' | 'PERMANENT';
  publisherDown: boolean;
  duplicateDelivery: boolean;
}
export interface Counters {
  duplicateClaimsDropped: number;
  retriesScheduled: number;
  dlqTotal: number;
  cacheHits: number;
  cacheMisses: number;
  cacheEvictions: number;
}
export interface JobMsg {
  jobId: string;
  dup: boolean;
}
export interface GenMsg {
  certId: string;
  attempts: number;
}
export interface RetryEntry {
  certId: string;
  attempts: number;
  dueAt: number;
}
export interface WorkerRec {
  id: string;
  type: 'PDF' | 'EMAIL';
  processed: number;
  busyUntil: number;
  /** PDF: job id. EMAIL: certificate id. */
  taskId: string | null;
  taskAttempts: number;
  taskLabel: string | null;
}
export interface Pipe {
  orgId: string;
  publisherLastTickAt: number;
  publisherLastPublishedAt: number | null;
  outboxPublished: number;
  outboxFailed: number;
  jobsQueue: JobMsg[];
  genQueue: GenMsg[];
  retries: RetryEntry[];
  jobsProduced: number;
  jobsConsumed: number;
  genProduced: number;
  genConsumed: number;
  dlqReplayed: number;
  workers: WorkerRec[];
  counters: Counters;
  chaos: Chaos;
  dlq: DlqEntry[];
  events: PipeEvent[];
  mailbox: MailEntry[];
  /** verification token -> cache expiry (ms epoch) */
  cache: Record<string, number>;
}

export interface PendingReg {
  email: string;
  fullName: string;
  password: string;
  organizationName: string;
  otp: string;
  expiresAt: number;
}
export interface PendingReset {
  email: string;
  otp: string;
  expiresAt: number;
}

export interface DB {
  v: 1;
  seq: { cert: number };
  users: Record<string, UserRec>;
  orgs: Record<string, OrgRec>;
  members: MemberRec[];
  sessions: Record<string, string>;
  pendingRegs: Record<string, PendingReg>;
  pendingResets: Record<string, PendingReset>;
  events: Record<string, EventRec>;
  templates: Record<string, TemplateRec>;
  batches: Record<string, BatchRec>;
  jobs: Record<string, JobRec>;
  outbox: OutboxRow[];
  certs: Record<string, CertRec>;
  emailAttempts: EmailAttemptRec[];
  audit: AuditRec[];
  pipes: Record<string, Pipe>;
}
