import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type LucideIcon, Plus, RefreshCw, ArrowUpRight, ArrowRight, CalendarDays, FileBadge2, MailCheck, Clock3, AlertTriangle, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { CountUp, EmptyState, IconChip, PageSkeleton, Seal, StatusStamp } from '../components/ui';

export const Dashboard: React.FC = () => {
  const { activeOrg, user } = useAuth();
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
    return <PageSkeleton label="Loading overview" figures={4} />;
  }

  const events = stats?.totalEvents || 0;
  const generated = stats?.totalCertificatesGenerated || 0;
  const delivered = stats?.totalEmailsSent || 0;
  const pending = stats?.totalPendingJobs || 0;
  const failed = stats?.totalFailed || 0;
  const recentBatches: any[] = stats?.recentBatches || [];
  const hasData = events + generated + delivered + pending + failed > 0 || recentBatches.length > 0;
  const deliveryRate = pct(delivered, generated);
  const firstName = (user?.fullName || '').split(' ')[0];

  const figures: Figure[] = [
    { label: 'Events', value: events, note: events === 1 ? 'event in this organization' : 'events in this organization', icon: CalendarDays, tone: 'ink' },
    { label: 'Generated', value: generated, note: 'certificates issued', icon: FileBadge2, tone: 'seal' },
    { label: 'Delivered', value: delivered, note: generated > 0 ? `${deliveryRate}% of generated` : 'emails sent', icon: MailCheck, tone: 'ok' },
    { label: 'Pending', value: pending, note: pending > 0 ? 'jobs still in the queue' : 'queue is clear', icon: Clock3, tone: pending > 0 ? 'warn' : 'ink' },
    { label: 'Failed', value: failed, note: failed > 0 ? 'deliveries need a retry' : 'no failed deliveries', icon: AlertTriangle, tone: failed > 0 ? 'bad' : 'ink' },
  ];

  const funnel = [
    { label: 'Generated', value: generated, base: generated, bar: '', dot: 'bg-seal-500' },
    { label: 'Delivered', value: delivered, base: generated, bar: '!bg-none !bg-ok-500', dot: 'bg-ok-500' },
    { label: 'Pending', value: pending, base: generated, bar: '!bg-none !bg-warn-500', dot: 'bg-warn-500' },
    { label: 'Failed', value: failed, base: generated, bar: '!bg-none !bg-bad-500', dot: 'bg-bad-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome band */}
      <section className="hero-ink relative isolate overflow-hidden rounded-[16px] text-white shadow-lift" aria-label="Welcome">
        <div className="guilloche-light absolute inset-0 -z-10 opacity-80" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 opacity-[0.14] motion-safe:animate-spin-slow sm:-right-10" aria-hidden="true">
          <Seal size={340} tone="foil" mark="none" />
        </div>
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-seal-100/80">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-seal-200 opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-seal-200" />
              </span>
              Live registry · refreshes every 5s
            </p>
            <h1 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">
              {greeting()}
              {firstName ? <>, <span className="text-foil-gradient">{firstName}</span></> : null}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-white/70">
              <span className="font-semibold text-white/90">{activeOrg?.organizationName || 'Overview'}</span>
              {activeOrg?.role && (
                <span className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/80">
                  {activeOrg.role}
                </span>
              )}
            </p>
            {hasData && generated > 0 && (
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-white/60">
                <span className="num font-semibold text-white">{delivered.toLocaleString()}</span> of{' '}
                <span className="num font-semibold text-white">{generated.toLocaleString()}</span> certificates have reached their
                recipients{failed > 0 ? <>, and <span className="num font-semibold text-foil-100">{failed}</span> need attention.</> : '.'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={fetchStats} className="btn-glass" aria-label="Refresh figures">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link to="/certificates" className="btn-glass">
              <FileBadge2 className="h-4 w-4" />
              Certificates
            </Link>
            <Link to="/events" className="btn border-white bg-white text-ink shadow-raise hover:bg-paper-50">
              <Plus className="h-4 w-4" />
              Create event
            </Link>
          </div>
        </div>
      </section>

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
        <>
          <section aria-label="Key figures">
            <dl className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
              {figures.map((f, i) => (
                <div
                  key={f.label}
                  className={`panel group relative overflow-hidden p-4 transition-shadow duration-200 hover:shadow-raise sm:p-5 ${
                    i === figures.length - 1 ? 'col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <span className={`absolute inset-x-0 top-0 h-[2px] ${ACCENT[f.tone]}`} aria-hidden="true" />
                  <div className="flex items-start justify-between gap-2">
                    <dt className="eyebrow pt-2">{f.label}</dt>
                    <IconChip tone={f.tone}>
                      <f.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </IconChip>
                  </div>
                  <dd className="mt-2 font-display text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[36px]">
                    <CountUp value={f.value} className="tabular-nums" />
                  </dd>
                  <p className="mt-2 text-[12px] text-ink-500">{f.note}</p>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Delivery funnel</h2>
                <p className="mt-0.5 text-[12px] text-ink-500">How far generated certificates have travelled.</p>
              </div>
              <span className="eyebrow hidden sm:block">Share of generated</span>
            </div>
            <div className="panel-body">
              {generated === 0 ? (
                <p className="text-[13px] text-ink-500">Nothing has been generated yet. The funnel fills in once a batch finishes.</p>
              ) : (
                <div className="grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
                  <DeliveryRing rate={deliveryRate} delivered={delivered} generated={generated} />
                  <div className="space-y-5">
                    {funnel.map((row) => (
                      <div key={row.label}>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <span className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
                            <i className={`h-2 w-2 rounded-full ${row.dot}`} aria-hidden="true" />
                            {row.label}
                          </span>
                          <span className="num text-[12px] text-ink-500">
                            <span className="font-semibold text-ink">{row.value.toLocaleString()}</span>
                            <span className="ml-1.5 text-ink-400">{pct(row.value, row.base)}%</span>
                          </span>
                        </div>
                        <div className="meter !h-2" role="progressbar" aria-label={row.label} aria-valuenow={pct(row.value, row.base)} aria-valuemin={0} aria-valuemax={100}>
                          <span className={row.bar} style={{ width: `${pct(row.value, row.base)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Recent batches</h2>
                <p className="mt-0.5 text-[12px] text-ink-500">Processing progress for the latest runs.</p>
              </div>
              <Link to="/events" className="link inline-flex items-center gap-1 text-[12px]">
                All events
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentBatches.length > 0 ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="ledger">
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Status</th>
                        <th className="min-w-[160px]">Progress</th>
                        <th>Generated</th>
                        <th>Emailed</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBatches.map((b: any) => {
                        const progress = batchProgress(b);
                        return (
                          <tr key={b.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <IconChip tone="ink" className="!h-8 !w-8">
                                  <Layers className="h-4 w-4" strokeWidth={1.75} />
                                </IconChip>
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink">{b.name}</p>
                                  <p className="truncate text-[12px] text-ink-500">{b.eventName}</p>
                                </div>
                              </div>
                            </td>
                            <td><StatusStamp status={b.status} /></td>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className="meter"><span style={{ width: `${progress}%` }} /></div>
                                <span className="num w-9 text-right text-[12px] text-ink-500">{progress}%</span>
                              </div>
                            </td>
                            <td className="num text-[12px]"><span className="text-ink">{b.generatedCount}</span><span className="text-ink-400"> / {b.totalCount}</span></td>
                            <td className="num text-[12px]"><span className="text-ink">{b.emailSentCount}</span><span className="text-ink-400"> / {b.totalCount}</span></td>
                            <td className="text-right">
                              <Link to={`/batches/${b.id}/progress`} className="btn-secondary btn-sm group">
                                Monitor
                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-paper-100 md:hidden">
                  {recentBatches.map((b: any) => {
                    const progress = batchProgress(b);
                    return (
                      <li key={b.id}>
                        <Link to={`/batches/${b.id}/progress`} className="block px-4 py-4 transition-colors hover:bg-seal-50/40">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-ink">{b.name}</p>
                              <p className="truncate text-[12px] text-ink-500">{b.eventName}</p>
                            </div>
                            <StatusStamp status={b.status} />
                          </div>
                          <div className="mt-3 flex items-center gap-2.5">
                            <div className="meter"><span style={{ width: `${progress}%` }} /></div>
                            <span className="num text-[12px] text-ink-500">{progress}%</span>
                          </div>
                          <p className="num mt-2 text-[11px] text-ink-400">
                            {b.generatedCount}/{b.totalCount} generated · {b.emailSentCount}/{b.totalCount} emailed
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyState
                title="No batches yet"
                description="Open an event, upload a participant CSV, and the batch appears here while it runs."
                action={<Link to="/events" className="btn-primary">Go to events</Link>}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
};

type Tone = 'seal' | 'ok' | 'warn' | 'bad' | 'ink';
interface Figure {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  tone: Tone;
}

const ACCENT: Record<Tone, string> = {
  seal: 'bg-gradient-to-r from-seal-500 to-seal-200',
  ok: 'bg-gradient-to-r from-ok-500 to-ok-500/30',
  warn: 'bg-gradient-to-r from-warn-500 to-warn-500/30',
  bad: 'bg-gradient-to-r from-bad-500 to-bad-500/30',
  ink: 'bg-gradient-to-r from-ink-300 to-transparent',
};

function batchProgress(b: any): number {
  return b.totalCount > 0 ? Math.round(((b.generatedCount + b.failedCount) / b.totalCount) * 100) : 0;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const DeliveryRing: React.FC<{ rate: number; delivered: number; generated: number }> = ({ rate, delivered, generated }) => {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-[180px] w-[180px]" role="img" aria-label={`${rate}% of generated certificates delivered`}>
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2FA79D" />
            <stop offset="100%" stopColor="#0B6F69" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#EEF1F5" strokeWidth="14" />
        <circle cx="90" cy="90" r={r - 14} fill="none" stroke="#E0E5EC" strokeWidth="1" strokeDasharray="2 4" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - rate / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[34px] font-semibold leading-none tracking-tight text-ink">
          <CountUp value={rate} />%
        </span>
        <span className="eyebrow mt-1.5">Delivered</span>
        <span className="num mt-1 text-[11px] text-ink-400">
          {delivered.toLocaleString()} / {generated.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

function pct(value: number, base: number): number {
  if (!base) return 0;
  return Math.min(100, Math.round((value / base) * 100));
}
