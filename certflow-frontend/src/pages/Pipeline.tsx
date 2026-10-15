import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Inbox, RotateCcw } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CertificateCanvas } from '../components/CertificateCanvas';
import { downloadCertificate } from '../lib/links';
import { EmptyState, Modal, PageHeader, PageLoading, Spinner, StatusStamp, formatWhen } from '../components/ui';

/* ------------------------------------------------------------------ */
/* Types (every field optional: the backend may be mocked or partial)  */
/* ------------------------------------------------------------------ */

type SmtpMode = 'NONE' | 'TRANSIENT' | 'PERMANENT';

interface TopicInfo {
  name?: string;
  depth?: number;
  produced?: number;
  consumed?: number;
}
interface WorkerInfo {
  id?: string;
  type?: 'PDF' | 'EMAIL';
  status?: 'IDLE' | 'BUSY';
  processed?: number;
  currentTask?: string | null;
}
interface DlqItem {
  id: string;
  certificateId?: string;
  participantName?: string;
  recipientEmail?: string;
  reason?: string;
  attempts?: number;
  at?: string;
}
interface EventItem {
  id: string | number;
  at?: string;
  kind?: string;
  message?: string;
}
interface MailItem {
  id: string | number;
  at?: string;
  to?: string;
  subject?: string;
  certificateId?: string;
  attachmentName?: string;
}
interface PipelineData {
  publisher?: { status?: 'RUNNING' | 'STOPPED'; lastPublishedAt?: string | null };
  outbox?: { pending?: number; published?: number; failed?: number };
  topics?: TopicInfo[];
  workers?: WorkerInfo[];
  counters?: {
    duplicateClaimsDropped?: number;
    retriesScheduled?: number;
    dlqTotal?: number;
    cacheHits?: number;
    cacheMisses?: number;
    cacheEvictions?: number;
  };
  chaos?: { smtpMode?: SmtpMode; publisherDown?: boolean; duplicateDelivery?: boolean };
  dlq?: DlqItem[];
  events?: EventItem[];
  mailbox?: MailItem[];
}

const TOPIC_JOBS = 'certflow.certificate.jobs';
const TOPIC_GENERATED = 'certflow.certificate.generated';
const TOPIC_DLQ = 'certflow.dlq';

function errMsg(e: unknown, fallback: string): string {
  const anyE = e as { response?: { data?: { message?: string } }; message?: string };
  return anyE?.response?.data?.message || anyE?.message || fallback;
}

function clock(iso?: string | null): string {
  if (!iso) return '--:--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

/* ------------------------------------------------------------------ */
/* Flow diagram styles (animated dashed connectors)                    */
/* ------------------------------------------------------------------ */

const FLOW_CSS = `
.cf-line { position:absolute; pointer-events:none; --c:#CBD3DE; }
.cf-line.on { --c:#12877F; }
.cf-line.x { height:2px; width:24px; top:50%; margin-top:-1px;
  background-image:repeating-linear-gradient(90deg,var(--c) 0 5px,transparent 5px 9px); }
.cf-line.y { width:2px; height:24px; left:50%; margin-left:-1px;
  background-image:repeating-linear-gradient(180deg,var(--c) 0 5px,transparent 5px 9px); }
.cf-line.on.x { animation:cf-dash-x .7s linear infinite; }
.cf-line.on.y { animation:cf-dash-y .7s linear infinite; }
.cf-line::after { content:''; position:absolute; border:5px solid transparent; }
.cf-line.r::after { right:-3px; top:-4px; border-left-color:var(--c); border-right-width:0; }
.cf-line.l::after { left:-3px; top:-4px; border-right-color:var(--c); border-left-width:0; }
.cf-line.d::after { bottom:-3px; left:-4px; border-top-color:var(--c); border-bottom-width:0; }
@keyframes cf-dash-x { to { background-position:9px 0; } }
@keyframes cf-dash-y { to { background-position:0 9px; } }
@keyframes cf-ping { 0%,100% { opacity:1 } 50% { opacity:.35 } }
.cf-busy { animation:cf-ping 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cf-line.on.x, .cf-line.on.y, .cf-busy { animation:none !important; }
}
`;

type Dir = 'r' | 'l' | 'd';

interface NodeProps {
  title: string;
  caption: string;
  placement: string;
  /** Connector leaving this node on wide screens. */
  out?: Dir;
  /** Connector leaving this node when stacked vertically. */
  stackedOut?: boolean;
  active?: boolean;
  bad?: boolean;
  children?: React.ReactNode;
}

const FlowNode: React.FC<NodeProps> = ({ title, caption, placement, out, stackedOut = true, active, bad, children }) => {
  const wide =
    out === 'r'
      ? 'x r -right-6'
      : out === 'l'
        ? 'x l -left-6'
        : out === 'd'
          ? 'y d -bottom-6'
          : '';
  return (
    <div
      className={`relative min-w-0 border bg-white p-3.5 ${bad ? 'border-bad-500/40' : 'border-paper-300'} rounded-md ${placement}`}
    >
      <h3 className="font-display text-[14px] font-semibold leading-tight text-ink">{title}</h3>
      <div className="mt-2.5 space-y-2">{children}</div>
      <p className="mt-2.5 text-[12px] leading-snug text-ink-500">{caption}</p>
      {stackedOut && <span className={`cf-line y d -bottom-6 min-[900px]:hidden ${active ? 'on' : ''}`} aria-hidden="true" />}
      {out && <span className={`cf-line ${wide} hidden min-[900px]:block ${active ? 'on' : ''}`} aria-hidden="true" />}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: 'bad' | 'ok' | 'warn' }> = ({ label, value, tone }) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-[12px] text-ink-500">{label}</span>
    <span
      className={`num text-[15px] font-semibold ${tone === 'bad' ? 'text-bad-700' : tone === 'ok' ? 'text-ok-700' : tone === 'warn' ? 'text-warn-700' : 'text-ink'}`}
    >
      {value}
    </span>
  </div>
);

const TopicBox: React.FC<{ name: string; topic?: TopicInfo; bad?: boolean }> = ({ name, topic, bad }) => {
  const depth = topic?.depth ?? 0;
  return (
    <>
      <p className="break-all font-mono text-[10.5px] leading-tight text-ink-400">{name}</p>
      <div className="flex items-baseline gap-2">
        <span className={`num text-[26px] font-semibold leading-none ${bad && depth > 0 ? 'text-bad-700' : 'text-ink'}`}>{depth}</span>
        <span className="text-[12px] text-ink-500">waiting</span>
      </div>
      <p className="num text-[11px] text-ink-400">
        in {topic?.produced ?? 0} / out {topic?.consumed ?? 0}
      </p>
    </>
  );
};

const WorkerChips: React.FC<{ workers: WorkerInfo[] }> = ({ workers }) =>
  workers.length === 0 ? (
    <p className="text-[12px] text-ink-400">No workers reported</p>
  ) : (
    <ul className="flex flex-wrap gap-1.5">
      {workers.map((w, i) => {
        const busy = w.status === 'BUSY';
        return (
          <li
            key={w.id ?? i}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 ${busy ? 'border-seal-500/40 bg-seal-50' : 'border-paper-300 bg-paper-50'}`}
            title={w.currentTask ? `Working on ${w.currentTask}` : 'Waiting for work'}
          >
            <i className={`h-2 w-2 rounded-full ${busy ? 'cf-busy bg-seal-500' : 'bg-ink-300'}`} />
            <span className="font-mono text-[11px] text-ink-700">{w.id ?? 'worker'}</span>
            <span className="font-mono text-[10px] uppercase text-ink-400">{busy ? 'busy' : 'idle'}</span>
            <span className="num text-[11px] font-semibold text-ink">{w.processed ?? 0}</span>
          </li>
        );
      })}
    </ul>
  );

/* ------------------------------------------------------------------ */
/* Switch + segmented control                                          */
/* ------------------------------------------------------------------ */

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-500 focus-visible:ring-offset-2 disabled:opacity-50 ${checked ? 'border-bad-500 bg-bad-500' : 'border-paper-300 bg-paper-200'}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const SMTP_OPTIONS: { value: SmtpMode; label: string }[] = [
  { value: 'NONE', label: 'Healthy' },
  { value: 'TRANSIENT', label: 'Flaky' },
  { value: 'PERMANENT', label: 'Down' },
];

/* ------------------------------------------------------------------ */
/* Event kinds                                                         */
/* ------------------------------------------------------------------ */

const KIND_TONE: Record<string, string> = {
  OUTBOX: 'stamp-neutral',
  PUBLISH: 'stamp-info',
  CLAIM: 'stamp-seal',
  DUPLICATE_DROPPED: 'stamp-warn',
  RENDER: 'stamp-seal',
  STORE: 'stamp-seal',
  EMAIL_SENT: 'stamp-ok',
  RETRY: 'stamp-warn',
  DLQ: 'stamp-bad',
  CACHE_HIT: 'stamp-ok',
  CACHE_MISS: 'stamp-neutral',
  EVICT: 'stamp-foil',
  REVOKE: 'stamp-bad',
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const Pipeline: React.FC = () => {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.organizationId;

  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [chaosBusy, setChaosBusy] = useState(false);
  const [chaosError, setChaosError] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<string | null>(null);
  const [dlqError, setDlqError] = useState<string | null>(null);

  const [preview, setPreview] = useState<MailItem | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);

  const inFlight = useRef(false);

  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    setLoading(true);
    const tick = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await api.get(`/organizations/${orgId}/pipeline`);
        if (!alive) return;
        const next = res?.data?.data;
        if (next && typeof next === 'object') {
          setData(next);
          setUnavailable(false);
          setPulse((p) => p + 1);
        }
      } catch {
        if (alive) setUnavailable(true);
      } finally {
        inFlight.current = false;
        if (alive) setLoading(false);
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [orgId]);

  const applyChaos = useCallback(
    async (partial: Partial<NonNullable<PipelineData['chaos']>>) => {
      if (!orgId) return;
      setChaosBusy(true);
      setChaosError(null);
      try {
        const res = await api.post(`/organizations/${orgId}/pipeline/chaos`, partial);
        const next = res?.data?.data;
        if (next) setData(next);
      } catch (e) {
        setChaosError(errMsg(e, 'Could not change the failure setting.'));
      } finally {
        setChaosBusy(false);
      }
    },
    [orgId],
  );

  const replay = async (id: string) => {
    if (!orgId) return;
    setReplaying(id);
    setDlqError(null);
    try {
      const res = await api.post(`/organizations/${orgId}/pipeline/dlq/${id}/replay`);
      const next = res?.data?.data;
      if (next) setData(next);
    } catch (e) {
      setDlqError(errMsg(e, 'Could not replay that message.'));
    } finally {
      setReplaying(null);
    }
  };

  const openPreview = async (m: MailItem) => {
    setPreview(m);
    setPreviewData(null);
    setPreviewError(null);
    setDlError(null);
    if (!m.certificateId) {
      setPreviewError('This message has no certificate attached.');
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await api.get(`/certificates/${m.certificateId}/render-data`);
      setPreviewData(res?.data?.data ?? null);
    } catch (e) {
      setPreviewError(errMsg(e, 'Could not load the certificate preview.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const download = async () => {
    if (!preview?.certificateId) return;
    setDlError(null);
    try {
      await downloadCertificate(preview.certificateId);
    } catch (e) {
      setDlError(errMsg(e, 'Download failed.'));
    }
  };

  /* ---- derived values ---- */
  const d = data ?? {};
  const topics = d.topics ?? [];
  const topic = (suffix: string) => topics.find((t) => (t.name ?? '').endsWith(suffix));
  const jobs = topic('jobs');
  const generated = topic('generated');
  const dlqTopic = topic('dlq');
  const workers = d.workers ?? [];
  const pdfWorkers = workers.filter((w) => w.type === 'PDF');
  const emailWorkers = workers.filter((w) => w.type === 'EMAIL');
  const pending = d.outbox?.pending ?? 0;
  const published = d.outbox?.published ?? 0;
  const failedOutbox = d.outbox?.failed ?? 0;
  const counters = d.counters ?? {};
  const chaos = d.chaos ?? {};
  const smtpMode = chaos.smtpMode ?? 'NONE';
  const publisherDown = !!chaos.publisherDown || d.publisher?.status === 'STOPPED';
  const dlqItems = d.dlq ?? [];
  const events = d.events ?? [];
  const mailbox = d.mailbox ?? [];
  const dlqDepth = dlqTopic?.depth ?? dlqItems.length;
  const anyBusy = (list: WorkerInfo[]) => list.some((w) => w.status === 'BUSY');

  const live = (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-500" role="status">
      <i
        key={pulse}
        className={`h-2 w-2 rounded-full ${unavailable ? 'bg-bad-500' : 'cf-busy bg-seal-500'}`}
      />
      {unavailable ? 'Connection lost' : 'Updating'}
    </span>
  );

  const header = (
    <PageHeader
      eyebrow="System"
      title="Pipeline"
      description="Watch a certificate batch travel from the database to the recipient's inbox, and break things on purpose to see the system recover."
      actions={live}
    />
  );

  if (!orgId) {
    return (
      <div>
        {header}
        <div className="panel">
          <EmptyState title="No organization selected" description="Choose an organization to see its pipeline." />
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div>
        {header}
        <PageLoading label="Connecting to the pipeline" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {header}
        <div className="panel">
          <EmptyState
            title="Pipeline data is unavailable"
            description="The pipeline endpoint did not respond. This page keeps retrying every second."
            icon={<AlertTriangle className="h-10 w-10 text-warn-500" />}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{FLOW_CSS}</style>
      {header}

      {unavailable && (
        <div className="alert-warn mb-5" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Lost contact with the pipeline. Showing the last numbers received and retrying.
        </div>
      )}

      {/* ---------------- 1. Flow diagram ---------------- */}
      <section className="panel mb-6" aria-labelledby="flow-title">
        <div className="panel-head">
          <div>
            <h2 id="flow-title" className="panel-title">How a certificate travels</h2>
            <p className="mt-0.5 text-[12px] text-ink-500">Dashed lines move while work is flowing between two steps.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-5">
            <FlowNode
              title="1. API and database"
              caption="Saves the certificate and its job together in one transaction, so nothing is lost if the server crashes."
              placement="min-[900px]:col-start-1 min-[900px]:row-start-1"
              out="r"
              active={pending > 0}
            >
              <p className="font-mono text-[11px] text-ink-400">one transaction</p>
            </FlowNode>

            <FlowNode
              title="2. Outbox table"
              caption="A to-do list stored beside the data. Each row is a job waiting to be sent on."
              placement="min-[900px]:col-start-2 min-[900px]:row-start-1"
              out="r"
              active={pending > 0}
            >
              <Stat label="Waiting" value={pending} tone={pending > 0 ? 'warn' : undefined} />
              <Stat label="Sent on" value={published} />
              {failedOutbox > 0 && <Stat label="Failed" value={failedOutbox} tone="bad" />}
            </FlowNode>

            <FlowNode
              title="3. Publisher"
              caption="Picks up outbox rows and hands them to the message queue. Several can run without grabbing the same row."
              placement="min-[900px]:col-start-3 min-[900px]:row-start-1"
              out="r"
              active={pending > 0 && !publisherDown}
              bad={publisherDown}
            >
              <StatusStamp
                status={publisherDown ? 'STOPPED' : 'RUNNING'}
                tone={publisherDown ? 'bad' : 'ok'}
                label={publisherDown ? 'Stopped' : 'Running'}
              />
              <p className="text-[11px] text-ink-400">Last sent {d.publisher?.lastPublishedAt ? clock(d.publisher.lastPublishedAt) : 'never'}</p>
            </FlowNode>

            <FlowNode
              title="4. Queue: jobs"
              caption="A line of PDF jobs. Messages wait here until a worker is free."
              placement="min-[900px]:col-start-4 min-[900px]:row-start-1"
              out="r"
              active={(jobs?.depth ?? 0) > 0}
            >
              <TopicBox name={jobs?.name ?? TOPIC_JOBS} topic={jobs} />
            </FlowNode>

            <FlowNode
              title="5. PDF workers"
              caption={`Each job is claimed by one worker only. ${counters.duplicateClaimsDropped ?? 0} repeat claims dropped so far.`}
              placement="min-[900px]:col-start-5 min-[900px]:row-start-1"
              out="d"
              active={anyBusy(pdfWorkers)}
            >
              <WorkerChips workers={pdfWorkers} />
              <p className="font-mono text-[10.5px] text-ink-400">draws PDF + QR code</p>
            </FlowNode>

            <FlowNode
              title="6. Queue: generated"
              caption="Finished certificates waiting to be emailed."
              placement="min-[900px]:col-start-5 min-[900px]:row-start-2"
              out="l"
              active={(generated?.depth ?? 0) > 0}
            >
              <TopicBox name={generated?.name ?? TOPIC_GENERATED} topic={generated} />
            </FlowNode>

            <FlowNode
              title="7. Email workers"
              caption="Send each certificate. If the mail server fails they wait longer after each try, then give up."
              placement="min-[900px]:col-start-4 min-[900px]:row-start-2"
              out="l"
              active={anyBusy(emailWorkers)}
            >
              <WorkerChips workers={emailWorkers} />
              <Stat label="Retries scheduled" value={counters.retriesScheduled ?? 0} tone={(counters.retriesScheduled ?? 0) > 0 ? 'warn' : undefined} />
              <span
                className={`cf-line y d -bottom-6 hidden min-[900px]:block ${smtpMode === 'PERMANENT' && anyBusy(emailWorkers) ? 'on' : ''}`}
                aria-hidden="true"
              />
            </FlowNode>

            <FlowNode
              title="8. Mail server inbox"
              caption="Where delivered emails land. Open the inbox below to see them."
              placement="min-[900px]:col-start-3 min-[900px]:row-start-2"
              stackedOut={false}
            >
              <Stat label="Delivered" value={mailbox.length} tone={mailbox.length > 0 ? 'ok' : undefined} />
            </FlowNode>

            <FlowNode
              title="Dead-letter queue"
              caption="Messages that cannot be delivered are parked here for a person to review. Nothing is silently dropped."
              placement="min-[900px]:col-start-4 min-[900px]:row-start-3"
              stackedOut={false}
              bad={dlqDepth > 0}
            >
              <TopicBox name={dlqTopic?.name ?? TOPIC_DLQ} topic={{ ...dlqTopic, depth: dlqDepth }} bad />
            </FlowNode>

            <FlowNode
              title="Redis cache"
              caption="Remembers public verification answers for 1 hour so repeat checks are instant. Revoking a certificate clears its entry."
              placement="min-[900px]:col-start-1 min-[900px]:row-start-2"
              stackedOut={false}
            >
              <Stat label="Hits" value={counters.cacheHits ?? 0} tone="ok" />
              <Stat label="Misses" value={counters.cacheMisses ?? 0} />
              <Stat label="Evictions" value={counters.cacheEvictions ?? 0} />
            </FlowNode>
          </div>
          {/* Email workers reach the dead-letter queue by a branch drawn below them on wide screens */}
          <p className="mt-6 hidden text-[12px] text-ink-400 min-[900px]:block">
            Email workers send failed messages down to the dead-letter queue after the retries run out or the failure is permanent.
          </p>
        </div>
      </section>

      {/* ---------------- 2. Failure lab ---------------- */}
      <section className="panel mb-6" aria-labelledby="lab-title">
        <div className="panel-head">
          <div>
            <h2 id="lab-title" className="panel-title">Failure lab</h2>
            <p className="mt-0.5 text-[12px] text-ink-500">Break one part at a time and watch the rest of the system cope.</p>
          </div>
          {chaosBusy && <Spinner label="Applying" />}
        </div>
        <div className="grid grid-cols-1 divide-y divide-paper-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="panel-body">
            <p id="smtp-label" className="label">Mail server health</p>
            <div role="radiogroup" aria-labelledby="smtp-label" className="inline-flex w-full overflow-hidden rounded-md border border-paper-300">
              {SMTP_OPTIONS.map((o) => {
                const on = smtpMode === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={chaosBusy}
                    onClick={() => !on && applyChaos({ smtpMode: o.value })}
                    className={`h-9 flex-1 border-r border-paper-300 text-[13px] font-semibold last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-seal-500 disabled:opacity-60 ${
                      on
                        ? o.value === 'NONE'
                          ? 'bg-ok-50 text-ok-700'
                          : o.value === 'TRANSIENT'
                            ? 'bg-warn-50 text-warn-700'
                            : 'bg-bad-50 text-bad-700'
                        : 'bg-white text-ink-600 hover:bg-paper-100'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
              {smtpMode === 'NONE' && 'Emails send on the first try.'}
              {smtpMode === 'TRANSIENT' && 'Flaky: each email fails twice, then succeeds. Watch the retries wait longer each time.'}
              {smtpMode === 'PERMANENT' && 'Down: every send is rejected for good, so each message goes straight to the dead-letter queue.'}
            </p>
            <p className="hint">Shows: failed emails are retried with growing delays, and hopeless ones are parked instead of lost.</p>
            <div className="mt-3 flex gap-6">
              <div>
                <p className="num text-[20px] font-semibold text-warn-700">{counters.retriesScheduled ?? 0}</p>
                <p className="text-[11px] text-ink-500">retries scheduled</p>
              </div>
              <div>
                <p className="num text-[20px] font-semibold text-bad-700">{counters.dlqTotal ?? 0}</p>
                <p className="text-[11px] text-ink-500">sent to dead letters</p>
              </div>
            </div>
          </div>

          <div className="panel-body">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id="pub-label" className="label !mb-0">Stop the outbox publisher</p>
                <p className="mt-1 text-[12px] text-ink-500">{publisherDown ? 'Publisher is stopped.' : 'Publisher is running.'}</p>
              </div>
              <Switch
                label="Stop the outbox publisher"
                checked={!!chaos.publisherDown}
                disabled={chaosBusy}
                onChange={(v) => applyChaos({ publisherDown: v })}
              />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
              New jobs keep piling up in the outbox table. Turn the publisher back on and they all drain through.
            </p>
            <p className="hint">Shows: nothing is lost when the message queue side is down, because every job is saved first.</p>
            <div className="mt-3 flex gap-6">
              <div>
                <p className={`num text-[20px] font-semibold ${pending > 0 ? 'text-warn-700' : 'text-ink'}`}>{pending}</p>
                <p className="text-[11px] text-ink-500">waiting in outbox</p>
              </div>
              <div>
                <p className="num text-[20px] font-semibold text-ink">{published}</p>
                <p className="text-[11px] text-ink-500">sent on</p>
              </div>
            </div>
          </div>

          <div className="panel-body">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id="dup-label" className="label !mb-0">Deliver every message twice</p>
                <p className="mt-1 text-[12px] text-ink-500">{chaos.duplicateDelivery ? 'Duplicates are on.' : 'Duplicates are off.'}</p>
              </div>
              <Switch
                label="Deliver every message twice"
                checked={!!chaos.duplicateDelivery}
                disabled={chaosBusy}
                onChange={(v) => applyChaos({ duplicateDelivery: v })}
              />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
              Queues can hand out the same message more than once. Each job is claimed with a single atomic update, so only the first copy wins.
            </p>
            <p className="hint">Shows: no certificate is drawn or emailed twice.</p>
            <div className="mt-3">
              <p className="num text-[20px] font-semibold text-seal-700">{counters.duplicateClaimsDropped ?? 0}</p>
              <p className="text-[11px] text-ink-500">duplicate copies dropped</p>
            </div>
          </div>
        </div>
        {chaosError && (
          <div className="border-t border-paper-200 p-4">
            <div className="alert-error" role="alert">{chaosError}</div>
          </div>
        )}
        <div className="border-t border-paper-200 bg-paper-50 px-5 py-3 text-[13px] text-ink-600">
          Nothing moving? Open an event page and start a batch, then come back here to watch it travel.
        </div>
      </section>

      {/* ---------------- 3. Log + DLQ ---------------- */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel min-w-0" aria-labelledby="log-title">
          <div className="panel-head">
            <h2 id="log-title" className="panel-title">Live event log</h2>
            <span className="num text-[11px] text-ink-400">{events.length} latest</span>
          </div>
          <div className="h-[22rem] overflow-y-auto" tabIndex={0} aria-label="Event log, newest first">
            {events.length === 0 ? (
              <EmptyState title="No events yet" description="Events appear here as soon as a batch starts moving." />
            ) : (
              <ol className="font-mono text-[12px]">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1 border-b border-paper-100 px-4 py-2 sm:grid-cols-[4.5rem_9.5rem_1fr]"
                  >
                    <time className="num pt-0.5 text-ink-400" dateTime={ev.at}>{clock(ev.at)}</time>
                    <span className="justify-self-start">
                      <span className={KIND_TONE[ev.kind ?? ''] ?? 'stamp-neutral'}>{(ev.kind ?? 'EVENT').replace(/_/g, ' ')}</span>
                    </span>
                    <span className="col-span-2 min-w-0 break-words text-ink-700 sm:col-span-1">{ev.message}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="panel min-w-0" aria-labelledby="dlq-title">
          <div className="panel-head">
            <div>
              <h2 id="dlq-title" className="panel-title">Dead-letter queue</h2>
              <p className="mt-0.5 text-[12px] text-ink-500">Emails that could not be delivered. Replay sends them through again.</p>
            </div>
            <span className={`num text-[11px] ${dlqItems.length ? 'text-bad-700' : 'text-ink-400'}`}>{dlqItems.length} parked</span>
          </div>
          {dlqError && (
            <div className="p-4 pb-0">
              <div className="alert-error" role="alert">{dlqError}</div>
            </div>
          )}
          <div className="h-[22rem] overflow-auto">
            {dlqItems.length === 0 ? (
              <EmptyState title="No dead letters" description="Set the mail server to Down in the failure lab to see failed emails land here." />
            ) : (
              <table className="ledger min-w-[34rem]">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Reason</th>
                    <th className="text-right">Tries</th>
                    <th>When</th>
                    <th><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {dlqItems.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <p className="font-semibold text-ink">{it.participantName ?? 'Unknown'}</p>
                        <p className="font-mono text-[11px] text-ink-400">{it.recipientEmail}</p>
                      </td>
                      <td className="max-w-[14rem] text-[12px]">{it.reason}</td>
                      <td className="num text-right">{it.attempts ?? 0}</td>
                      <td className="num whitespace-nowrap text-[12px] text-ink-500">{clock(it.at)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={replaying === it.id}
                          onClick={() => replay(it.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {replaying === it.id ? 'Replaying' : 'Replay'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* ---------------- 4. Mailbox ---------------- */}
      <section className="panel" aria-labelledby="mail-title">
        <div className="panel-head">
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4 text-ink-500" />
            <div>
              <h2 id="mail-title" className="panel-title">Mailbox</h2>
              <p className="mt-0.5 text-[12px] text-ink-500">A mail catcher that holds every email the system sends. Select one to see its certificate.</p>
            </div>
          </div>
          <span className="num text-[11px] text-ink-400">{mailbox.length} messages</span>
        </div>
        {mailbox.length === 0 ? (
          <EmptyState title="Inbox is empty" description="Delivered certificate emails appear here." />
        ) : (
          <div className="max-h-[24rem] overflow-auto">
            <table className="ledger min-w-[40rem]">
              <thead>
                <tr>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Attachment</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {mailbox.map((m) => (
                  <tr key={m.id} className="cursor-pointer" onClick={() => openPreview(m)}>
                    <td>
                      <button
                        type="button"
                        className="rounded font-mono text-[12px] font-semibold text-ink hover:text-seal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(m);
                        }}
                      >
                        {m.to ?? 'unknown'}
                      </button>
                    </td>
                    <td>{m.subject}</td>
                    <td className="font-mono text-[12px] text-ink-600">{m.attachmentName ?? '-'}</td>
                    <td className="num whitespace-nowrap text-[12px] text-ink-500">{formatWhen(m.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.subject || 'Certificate preview'}
        description={preview?.to ? `Sent to ${preview.to}` : undefined}
        width="max-w-3xl"
        footer={
          <>
            {preview?.certificateId && (
              <button type="button" className="btn-secondary" onClick={download}>
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => setPreview(null)}>Close</button>
          </>
        }
      >
        {previewLoading && <Spinner label="Loading certificate" />}
        {previewError && <div className="alert-error" role="alert">{previewError}</div>}
        {dlError && <div className="alert-error mb-3" role="alert">{dlError}</div>}
        {previewData && (
          <CertificateCanvas layout={previewData.layoutConfig} values={previewData.values} verifyUrl={previewData.verifyUrl} />
        )}
        {preview?.attachmentName && (
          <p className="mt-3 font-mono text-[11px] text-ink-400">{preview.attachmentName}</p>
        )}
      </Modal>
    </div>
  );
};

export default Pipeline;
