import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Award, RefreshCw, Inbox, FileCog, Send, CheckCircle2, Users, FileBadge2, MailCheck, AlertTriangle, Check } from 'lucide-react';
import { PageHeader, StatusStamp, EmptyState, PageSkeleton, CountUp, IconChip, Avatar, formatWhen } from '../components/ui';

export const BatchProgress: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const [progress, setProgress] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = async () => {
    try {
      const [progRes, jobsRes] = await Promise.all([
        api.get(`/batches/${batchId}/progress`),
        api.get(`/batches/${batchId}/jobs?size=50`),
      ]);

      if (progRes.data.success) setProgress(progRes.data.data);
      if (jobsRes.data.success) setJobs(jobsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 2000); // 2 second polling for live updates
    return () => clearInterval(interval);
  }, [batchId]);

  if (loading && !progress) {
    return <PageSkeleton label="Loading batch" figures={4} />;
  }

  const isCompleted = progress?.status === 'COMPLETED';
  const isPartiallyFailed = progress?.status === 'PARTIALLY_FAILED';
  const pct = progress?.progressPercentage || 0;

  const total = progress?.totalParticipants ?? 0;
  const generated = progress?.certificatesGenerated ?? 0;
  const sent = progress?.emailsSent ?? 0;
  const failed = progress?.failedJobs ?? 0;
  const certPending = progress?.certificatesPending ?? 0;
  const emailPending = progress?.emailsPending ?? 0;

  // Stage counts derived from the existing progress fields.
  const stages = [
    { label: 'Queued', count: certPending, icon: Inbox },
    { label: 'Rendering PDFs', count: generated, icon: FileCog },
    { label: 'Delivering email', count: emailPending, icon: Send },
    { label: 'Completed', count: sent, icon: CheckCircle2 },
  ];
  let activeStage = 0;
  if (isCompleted || isPartiallyFailed || (total > 0 && sent + failed >= total)) activeStage = 3;
  else if (emailPending > 0 && certPending === 0) activeStage = 2;
  else if (generated > 0 || certPending < total) activeStage = certPending > 0 ? 1 : 2;

  const figures = [
    { k: 'Total', v: total, c: 'text-ink', icon: Users, tone: 'ink' as const },
    { k: 'Generated', v: generated, c: 'text-seal-700', icon: FileBadge2, tone: 'seal' as const },
    { k: 'Sent', v: sent, c: 'text-ok-700', icon: MailCheck, tone: 'ok' as const },
    { k: 'Failed', v: failed, c: failed > 0 ? 'text-bad-700' : 'text-ink', icon: AlertTriangle, tone: failed > 0 ? ('bad' as const) : ('ink' as const) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Live batch"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{progress?.batchName || 'Batch'}</span>
            <StatusStamp status={progress?.status} />
          </span>
        }
        description={
          <span className="font-mono text-[12px] break-all">{batchId}</span>
        }
        back={{ to: '/events', label: 'Back to events' }}
        actions={
          <>
            {(isCompleted || isPartiallyFailed) && (
              <Link to="/certificates" className="btn-primary">
                <Award className="h-4 w-4" />
                View certificates
              </Link>
            )}
            <button type="button" onClick={fetchProgress} className="btn-secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </>
        }
      />

      <section className="panel mb-6 overflow-hidden">
        <div className="panel-body space-y-6">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-0" aria-label="Pipeline stages">
            {stages.map((s, i) => {
              const active = i === activeStage;
              const passed = i < activeStage;
              const Icon = s.icon;
              return (
                <li key={s.label} aria-current={active ? 'step' : undefined} className="relative sm:pr-4">
                  {i < stages.length - 1 && (
                    <span
                      className={`absolute left-11 right-0 top-[18px] hidden h-[2px] rounded-full sm:block ${passed ? 'bg-seal-500' : 'bg-paper-200'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                      active
                        ? 'border-seal-500 bg-seal-500 text-white shadow-glow'
                        : passed
                        ? 'border-seal-500 bg-white text-seal-600'
                        : 'border-paper-300 bg-white text-ink-400'
                    }`}
                    aria-hidden="true"
                  >
                    {passed ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Icon className="h-4 w-4" />}
                    {active && !isCompleted && !isPartiallyFailed && (
                      <span className="absolute inset-0 rounded-full border-2 border-seal-500 motion-safe:animate-ping" />
                    )}
                  </span>
                  <p className={`eyebrow mt-3 ${active ? '!text-seal-700' : ''}`}>{s.label}</p>
                  <p className={`mt-1 font-display text-[22px] font-semibold leading-none tracking-tight ${active ? 'text-seal-700' : passed ? 'text-ink' : 'text-ink-400'}`}>
                    {s.count}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="rounded-lg border border-paper-200 bg-paper-50/70 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="eyebrow">Overall completion</span>
              <span className="font-display text-[24px] font-semibold leading-none tracking-tight text-ink">
                <CountUp value={pct} />%
              </span>
            </div>
            <div className="meter !h-2.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <dl className="stagger mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {figures.map((f) => (
          <div key={f.k} className="panel px-5 py-4">
            <div className="flex items-start justify-between">
              <dt className="eyebrow pt-1.5">{f.k}</dt>
              <IconChip tone={f.tone} className="!h-8 !w-8">
                <f.icon className="h-4 w-4" strokeWidth={1.75} />
              </IconChip>
            </div>
            <dd className={`mt-1 font-display text-[32px] font-semibold leading-none tracking-tight ${f.c}`}>
              <CountUp value={f.v} />
            </dd>
          </div>
        ))}
      </dl>

      <section className="panel overflow-hidden">
        <div className="panel-head">
          <h2 className="panel-title">Job ledger</h2>
          <span className="hint font-mono">{jobs.length} shown</span>
        </div>
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="Jobs appear here as soon as the workers pick up this batch. This page refreshes every 2 seconds."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger w-full min-w-[720px] text-left">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Email</th>
                  <th>PDF</th>
                  <th>Delivery</th>
                  <th>Attempts and error</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.jobId} className={job.errorMessage ? 'bg-bad-50/60' : ''}>
                    <td className="font-semibold text-ink">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={job.participantName} size="sm" />
                        {job.participantName}
                      </span>
                    </td>
                    <td className="font-mono text-[12px] break-all">{job.email}</td>
                    <td><StatusStamp status={job.status} /></td>
                    <td><StatusStamp status={job.emailStatus || 'PENDING'} /></td>
                    <td className="max-w-sm">
                      <span className="font-mono text-[12px] text-ink-500">{job.attemptCount} attempt{job.attemptCount === 1 ? '' : 's'}</span>
                      {job.errorMessage && (
                        <p className="mt-1 whitespace-normal break-words text-[12px] leading-snug text-bad-700">{job.errorMessage}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap font-mono text-[12px] text-ink-500">
                      {formatWhen(job.updatedAt || job.completedAt || job.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
