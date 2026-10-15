import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Award, RefreshCw } from 'lucide-react';
import { PageHeader, StatusStamp, EmptyState, PageLoading, formatWhen } from '../components/ui';

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
    return <PageLoading label="Loading batch" />;
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
    { label: 'Queued', count: certPending },
    { label: 'Rendering PDFs', count: generated },
    { label: 'Delivering email', count: emailPending },
    { label: 'Completed', count: sent },
  ];
  let activeStage = 0;
  if (isCompleted || isPartiallyFailed || (total > 0 && sent + failed >= total)) activeStage = 3;
  else if (emailPending > 0 && certPending === 0) activeStage = 2;
  else if (generated > 0 || certPending < total) activeStage = certPending > 0 ? 1 : 2;

  const figures = [
    { k: 'Total', v: total, c: 'text-ink' },
    { k: 'Generated', v: generated, c: 'text-seal-700' },
    { k: 'Sent', v: sent, c: 'text-ok-700' },
    { k: 'Failed', v: failed, c: failed > 0 ? 'text-bad-700' : 'text-ink' },
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

      <section className="panel mb-6">
        <div className="panel-body space-y-5">
          <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-paper-200 bg-paper-200 sm:grid-cols-4" aria-label="Pipeline stages">
            {stages.map((s, i) => {
              const active = i === activeStage;
              const passed = i < activeStage;
              return (
                <li
                  key={s.label}
                  aria-current={active ? 'step' : undefined}
                  className={`px-4 py-3 ${active ? 'bg-seal-50' : 'bg-white'}`}
                >
                  <p className={`eyebrow ${active ? 'text-seal-700' : ''}`}>{s.label}</p>
                  <p className={`mt-1 font-mono text-[22px] font-semibold leading-none ${active ? 'text-seal-700' : passed ? 'text-ink' : 'text-ink-400'}`}>
                    {s.count}
                  </p>
                </li>
              );
            })}
          </ol>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="eyebrow">Overall completion</span>
              <span className="font-mono text-[20px] font-semibold text-ink">{pct}%</span>
            </div>
            <div className="meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-paper-200 bg-paper-200 sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.k} className="bg-white px-5 py-4">
            <dt className="eyebrow">{f.k}</dt>
            <dd className={`mt-1.5 font-mono text-[34px] font-semibold leading-none ${f.c}`}>{f.v}</dd>
          </div>
        ))}
      </dl>

      <section className="panel">
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
                  <tr key={job.jobId} className={job.errorMessage ? 'bg-bad-50' : ''}>
                    <td className="font-semibold text-ink">{job.participantName}</td>
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
