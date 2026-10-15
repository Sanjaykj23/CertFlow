import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
  Users,
  Award,
  Send,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  StopCircle
} from 'lucide-react';

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
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCompleted = progress?.status === 'COMPLETED';
  const isPartiallyFailed = progress?.status === 'PARTIALLY_FAILED';
  const isFailed = progress?.status === 'FAILED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to events</span>
        </Link>
        <div className="flex flex-col sm:row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{progress?.batchName}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isPartiallyFailed
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                    : isFailed
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                    : 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse'
                }`}
              >
                {progress?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live processing stream • Asynchronous PDFBox workers & SMTP delivery
            </p>
          </div>

          <div className="flex items-center gap-3">
            {(isCompleted || isPartiallyFailed) && (
              <Link
                to="/certificates"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm transition"
              >
                <Award className="w-3.5 h-3.5" />
                <span>View & Download Certificates</span>
              </Link>
            )}
            <button
              onClick={fetchProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Overall Batch Completion
          </span>
          <span className="text-xl font-extrabold text-slate-900 font-mono">
            {progress?.progressPercentage || 0}%
          </span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-600 to-sky-400'
            }`}
            style={{ width: `${progress?.progressPercentage || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Real-time KPI Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{progress?.totalParticipants}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>PDFs Generated</span>
            <Award className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-600">{progress?.certificatesGenerated}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Emails Sent</span>
            <Send className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <span className="text-2xl font-bold text-sky-600">{progress?.emailsSent}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Certificates Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-2xl font-bold text-amber-600">{progress?.certificatesPending}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Emails Pending</span>
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-2xl font-bold text-indigo-600">{progress?.emailsPending}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Failed Jobs</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <span className="text-2xl font-bold text-rose-600">{progress?.failedJobs}</span>
        </div>
      </div>

      {/* Recent Failures Banner if any */}
      {progress?.recentFailures?.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2">
          <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Recent Processing Failures</span>
          </h4>
          <div className="divide-y divide-rose-100 text-xs">
            {progress.recentFailures.map((f: any) => (
              <div key={f.jobId} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-rose-900">{f.participantName}</span>
                  <span className="text-rose-600 ml-2 font-mono">({f.email})</span>
                  <p className="text-[11px] text-rose-700 mt-0.5">{f.errorMessage}</p>
                </div>
                <span className="text-[10px] text-rose-500 font-mono">Attempts: {f.attemptCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Participant Jobs Stream Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Individual Participant Jobs</h3>
          <span className="text-xs text-slate-400">Showing first {jobs.length} jobs</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold">
              <th className="py-2.5 px-4">Participant Name</th>
              <th className="py-2.5 px-4">Recipient Email</th>
              <th className="py-2.5 px-4">Worker Status</th>
              <th className="py-2.5 px-4">Email Delivery</th>
              <th className="py-2.5 px-4">Attempts</th>
              <th className="py-2.5 px-4">Error / Failure Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <tr key={job.jobId} className="hover:bg-slate-50/50 transition">
                <td className="py-2.5 px-4 font-semibold text-slate-800">{job.participantName}</td>
                <td className="py-2.5 px-4 text-slate-500 font-mono">{job.email}</td>
                <td className="py-2.5 px-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      job.status === 'GENERATED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : job.status === 'PROCESSING' || job.status === 'QUEUED'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse'
                        : job.status === 'FAILED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      job.emailStatus === 'SENT'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : job.emailStatus === 'FAILED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {job.emailStatus === 'SENT' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {job.emailStatus === 'FAILED' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                    {job.emailStatus || 'PENDING'}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-600">{job.attemptCount}</td>
                <td className="py-2.5 px-4 max-w-sm">
                  {job.errorMessage ? (
                    <span className="text-rose-600 font-medium flex items-center gap-1 text-[11px]" title={job.errorMessage}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                      <span className="truncate">{job.errorMessage}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
