import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Calendar,
  Award,
  Send,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Events',
      value: stats?.totalEvents || 0,
      icon: Calendar,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Certificates Generated',
      value: stats?.totalCertificatesGenerated || 0,
      icon: Award,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Emails Delivered',
      value: stats?.totalEmailsSent || 0,
      icon: Send,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-100',
    },
    {
      title: 'Pending Jobs',
      value: stats?.totalPendingJobs || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Failed Deliveries',
      value: stats?.totalFailed || 0,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry and status for <strong>{activeOrg?.organizationName}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            title="Refresh metrics"
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/events"
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
                <div className={`p-2 rounded-xl border ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {kpi.value.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Batches Activity Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Certificate Batches</h2>
            <p className="text-xs text-slate-500">Live processing progress and worker distribution</p>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>View all events</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats?.recentBatches?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
                  <th className="pb-3 pl-2">Batch Name</th>
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3">Generated</th>
                  <th className="pb-3">Emails Sent</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentBatches.map((b: any) => {
                  const progressPct = b.totalCount > 0 ? Math.round(((b.generatedCount + b.failedCount) / b.totalCount) * 100) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 pl-2 font-medium text-slate-900">{b.name}</td>
                      <td className="py-3.5 text-slate-600">{b.eventName}</td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.status === 'PROCESSING' || b.status === 'QUEUED'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-600 rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{progressPct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-600 font-mono text-xs">
                        {b.generatedCount} / {b.totalCount}
                      </td>
                      <td className="py-3.5 text-slate-600 font-mono text-xs">
                        {b.emailSentCount} / {b.totalCount}
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <Link
                          to={`/batches/${b.id}/progress`}
                          className="px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition"
                        >
                          Monitor
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No certificate batches created yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create an event, design a certificate template, and upload a participant CSV to launch your first batch.
            </p>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Get Started</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
