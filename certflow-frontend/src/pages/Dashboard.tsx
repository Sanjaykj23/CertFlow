import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { EmptyState, PageHeader, PageLoading, StatusStamp } from '../components/ui';

export const Dashboard: React.FC = () => {
  const { activeOrg } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!activeOrg) return;
    try {
      const res = await api.get(`/organizations/${activeOrg.organizationId}/dashboard-stats`);
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [activeOrg]);

  if (loading && !stats) {
    return <PageLoading label="Loading overview" />;
  }

  const events = stats?.totalEvents || 0;
  const generated = stats?.totalCertificatesGenerated || 0;
  const delivered = stats?.totalEmailsSent || 0;
  const pending = stats?.totalPendingJobs || 0;
  const failed = stats?.totalFailed || 0;
  const recentBatches: any[] = stats?.recentBatches || [];
  const hasData = events + generated + delivered + pending + failed > 0 || recentBatches.length > 0;

  const figures = [
    { label: 'Events', value: events, note: events === 1 ? 'event in this organization' : 'events in this organization' },
    { label: 'Generated', value: generated, note: 'certificates issued' },
    { label: 'Delivered', value: delivered, note: generated > 0 ? `${pct(delivered, generated)}% of generated` : 'emails sent' },
    { label: 'Pending', value: pending, note: pending > 0 ? 'jobs still in the queue' : 'queue is clear' },
    { label: 'Failed', value: failed, note: failed > 0 ? 'deliveries need a retry' : 'no failed deliveries' },
  ];

  const funnel = [
    { label: 'Generated', value: generated, base: generated, bar: '' },
    { label: 'Delivered', value: delivered, base: generated, bar: '' },
    { label: 'Pending', value: pending, base: generated, bar: '!bg-warn-500' },
    { label: 'Failed', value: failed, base: generated, bar: '!bg-bad-500' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Registry overview"
        title={activeOrg?.organizationName || 'Overview'}
        description="Live figures for this organization. They refresh every five seconds."
        actions={
          <>
            <button type="button" onClick={fetchStats} className="btn-secondary" aria-label="Refresh figures">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link to="/events" className="btn-primary">
              <Plus className="h-4 w-4" />
              Create event
            </Link>
          </>
        }
      />

      {!hasData ? (
        <div className="panel">
          <EmptyState
            title="No events yet"
            description="Create an event, design a certificate template, then upload a participant CSV to issue your first batch."
            action={
              <Link to="/events" className="btn-primary">
                <Plus className="h-4 w-4" />
                Create your first event
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="panel" aria-label="Key figures">
            <dl className="grid grid-cols-2 divide-paper-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x [&>div]:border-b [&>div]:border-paper-200 lg:[&>div]:border-b-0">
              {figures.map((f) => (
                <div key={f.label} className="p-5">
                  <dt className="eyebrow">{f.label}</dt>
                  <dd className="num mt-2 text-[34px] font-semibold leading-none text-ink">{f.value.toLocaleString()}</dd>
                  <p className="mt-2 text-[12px] text-ink-500">{f.note}</p>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Delivery funnel</h2>
              <span className="eyebrow">Share of generated</span>
            </div>
            <div className="panel-body space-y-4">
              {generated === 0 ? (
                <p className="text-[13px] text-ink-500">Nothing has been generated yet. The funnel fills in once a batch finishes.</p>
              ) : (
                funnel.map((row) => (
                  <div key={row.label}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium text-ink-700">{row.label}</span>
                      <span className="num text-[12px] text-ink-500">
                        {row.value.toLocaleString()} <span className="text-ink-400">/ {pct(row.value, row.base)}%</span>
                      </span>
                    </div>
                    <div className="meter" role="progressbar" aria-label={row.label} aria-valuenow={pct(row.value, row.base)} aria-valuemin={0} aria-valuemax={100}>
                      <span className={row.bar} style={{ width: `${pct(row.value, row.base)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Recent batches</h2>
                <p className="mt-0.5 text-[12px] text-ink-500">Processing progress for the latest runs.</p>
              </div>
              <Link to="/events" className="inline-flex items-center gap-1 text-[12px] font-semibold text-seal-700 hover:text-seal-600">
                All events
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentBatches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Event</th>
                      <th>Status</th>
                      <th className="min-w-[140px]">Progress</th>
                      <th>Generated</th>
                      <th>Emailed</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBatches.map((b: any) => {
                      const progress = b.totalCount > 0 ? Math.round(((b.generatedCount + b.failedCount) / b.totalCount) * 100) : 0;
                      return (
                        <tr key={b.id}>
                          <td className="font-medium text-ink">{b.name}</td>
                          <td className="text-ink-500">{b.eventName}</td>
                          <td><StatusStamp status={b.status} /></td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="meter"><span style={{ width: `${progress}%` }} /></div>
                              <span className="num text-[12px] text-ink-500">{progress}%</span>
                            </div>
                          </td>
                          <td className="num text-[12px]">{b.generatedCount} / {b.totalCount}</td>
                          <td className="num text-[12px]">{b.emailSentCount} / {b.totalCount}</td>
                          <td className="text-right">
                            <Link to={`/batches/${b.id}/progress`} className="btn-ghost btn-sm">Monitor</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No batches yet"
                description="Open an event, upload a participant CSV, and the batch appears here while it runs."
                action={<Link to="/events" className="btn-primary">Go to events</Link>}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
};

function pct(value: number, base: number): number {
  if (!base) return 0;
  return Math.min(100, Math.round((value / base) * 100));
}
