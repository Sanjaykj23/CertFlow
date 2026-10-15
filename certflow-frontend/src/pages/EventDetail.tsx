import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
  Calendar,
  Layers,
  Award,
  Upload,
  Palette,
  FileCheck,
  Download,
  RotateCcw,
  Ban,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

export const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'batches' | 'templates' | 'certificates'>('batches');
  const [loading, setLoading] = useState(true);

  // Revocation modal state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  const fetchEventData = async () => {
    try {
      const [eventRes, tplRes, batchRes, certRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/templates`),
        api.get(`/events/${eventId}/batches`),
        api.get(`/events/${eventId}/certificates`),
      ]);

      if (eventRes.data.success) setEvent(eventRes.data.data);
      if (tplRes.data.success) setTemplates(tplRes.data.data);
      if (batchRes.data.success) setBatches(batchRes.data.data);
      if (certRes.data.success) setCertificates(certRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertId || !revokeReason.trim()) return;
    setRevoking(true);
    try {
      await api.post(`/certificates/${selectedCertId}/revoke`, { reason: revokeReason.trim() });
      setRevokeModalOpen(false);
      setRevokeReason('');
      fetchEventData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revoke certificate');
    } finally {
      setRevoking(false);
    }
  };

  const handleResend = async (certId: string) => {
    try {
      await api.post(`/certificates/${certId}/resend`);
      alert('Email resend queued successfully!');
      fetchEventData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resend email');
    }
  };

  if (loading && !event) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/events" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to all events</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{event?.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">
                {event?.archived ? 'Archived' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Event Date: <strong>{event?.eventDate}</strong></span>
              <span>•</span>
              <span>{event?.description || 'No description provided.'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/events/${eventId}/templates/builder`}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 shadow-sm transition"
            >
              <Palette className="w-4 h-4 text-brand-600" />
              <span>Template Designer</span>
            </Link>
            <Link
              to={`/events/${eventId}/import-csv`}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>Issue Certificate Batch</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 relative transition ${
            activeTab === 'batches' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Certificate Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 relative transition ${
            activeTab === 'templates' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-3 relative transition ${
            activeTab === 'certificates' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Generated Certificates ({certificates.length})
        </button>
      </div>

      {/* Tab 1: Batches */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {batches.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4">Batch Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Generated</th>
                    <th className="py-3 px-4">Emails Sent</th>
                    <th className="py-3 px-4">Failed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => {
                    const pct = b.totalCount > 0 ? Math.round(((b.generatedCount + b.failedCount) / b.totalCount) * 100) : 0;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{b.name}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            b.status === 'PROCESSING' || b.status === 'QUEUED' ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{b.generatedCount} / {b.totalCount}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{b.emailSentCount} / {b.totalCount}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-rose-600">{b.failedCount}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/batches/${b.id}/progress`}
                            className="px-3 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-semibold transition"
                          >
                            Live Monitor
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No batches issued yet</h4>
              <p className="text-xs text-slate-500 mt-1">Upload a CSV file of participant names and emails to issue certificates.</p>
              <Link
                to={`/events/${eventId}/import-csv`}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Participants CSV</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-brand-600 uppercase tracking-wider text-[10px]">
                      {tpl.orientation} (v{tpl.version})
                    </span>
                    <span>{tpl.width} x {tpl.height} pt</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{tpl.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {tpl.layoutConfig?.textElements?.length || 0} customized placeholder elements configured.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/events/${eventId}/templates/builder?templateId=${tpl.id}`}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Edit Template
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Certificates */}
      {activeTab === 'certificates' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {certificates.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                  <th className="py-3 px-4">Certificate ID</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Email Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">{c.certificateNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.participantName}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{c.recipientEmail}</td>
                    <td className="py-3 px-4 text-slate-700 text-xs">{c.certificateType}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'VALID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        c.status === 'REVOKED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={`font-semibold ${c.emailStatus === 'SENT' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {c.emailStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-1.5">
                      <a
                        href={`/verify/${c.verificationToken}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Verify Publicly"
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`/api/v1/certificates/${c.id}/download`}
                        title="Download PDF"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleResend(c.id)}
                        title="Resend Email"
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {c.status === 'VALID' && (
                        <button
                          onClick={() => {
                            setSelectedCertId(c.id);
                            setRevokeModalOpen(true);
                          }}
                          title="Revoke Certificate"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No certificates generated yet for this event.
            </div>
          )}
        </div>
      )}

      {/* Revocation Modal */}
      {revokeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Revoke Certificate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Revoking a certificate immediately evicts it from the public verification cache and flags it as invalid.
            </p>
            <form onSubmit={handleRevoke}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Revocation</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Disqualified for rule infringement, issued in error..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevokeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revoking}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {revoking ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
