import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Search,
  Download,
  RotateCcw,
  Ban,
  ExternalLink,
  Repeat,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Certificates: React.FC = () => {
  const { activeOrg } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [activeCert, setActiveCert] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceName, setReplaceName] = useState('');
  const [replaceEmail, setReplaceEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!activeOrg) return;
      try {
        const res = await api.get(`/events?organizationId=${activeOrg.organizationId}`);
        if (res.data.success && res.data.data.length > 0) {
          setEvents(res.data.data);
          setSelectedEventId(res.data.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvents();
  }, [activeOrg]);

  const fetchCertificates = async () => {
    if (!selectedEventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/events/${selectedEventId}/certificates?size=100`);
      if (res.data.success) {
        setCertificates(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [selectedEventId]);

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCert || !revokeReason.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/certificates/${activeCert.id}/revoke`, { reason: revokeReason.trim() });
      setRevokeModalOpen(false);
      setRevokeReason('');
      fetchCertificates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Revocation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCert || !replaceReason.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/certificates/${activeCert.id}/replace`, {
        updatedParticipantName: replaceName.trim(),
        updatedEmail: replaceEmail.trim(),
        reason: replaceReason.trim(),
      });
      setReplaceModalOpen(false);
      setReplaceReason('');
      setReplaceName('');
      setReplaceEmail('');
      fetchCertificates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Replacement failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (certId: string) => {
    try {
      const res = await api.post(`/certificates/${certId}/resend`);
      alert(res.data?.message || 'Certificate email re-sent successfully!');
      fetchCertificates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resend email');
      fetchCertificates();
    }
  };

  const filtered = certificates.filter(
    (c) =>
      c.participantName.toLowerCase().includes(search.toLowerCase()) ||
      c.recipientEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Certificate Registry</h1>
          <p className="text-xs text-slate-500">
            Search, download, revoke, replace, and resend generated certificates.
          </p>
        </div>

        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by participant name, email, or certificate ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold">
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
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{c.certificateNumber}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{c.participantName}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{c.recipientEmail}</td>
                  <td className="py-3 px-4 text-slate-700">{c.certificateType}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'VALID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'REVOKED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.emailStatus === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.emailStatus === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.emailStatus === 'SENT' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {c.emailStatus === 'FAILED' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                        {c.emailStatus}
                      </span>
                      {c.emailStatus === 'FAILED' && c.emailErrorMessage && (
                        <p className="text-[10px] text-rose-600 font-medium max-w-[220px] leading-tight" title={c.emailErrorMessage}>
                          {c.emailErrorMessage}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/verify/${c.verificationToken}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Public Verification"
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
                        <>
                          <button
                            onClick={() => {
                              setActiveCert(c);
                              setReplaceName(c.participantName);
                              setReplaceEmail(c.recipientEmail);
                              setReplaceModalOpen(true);
                            }}
                            title="Issue Replacement"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveCert(c);
                              setRevokeModalOpen(true);
                            }}
                            title="Revoke Certificate"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            No certificates found matching your criteria.
          </div>
        )}
      </div>

      {/* Revocation Modal */}
      {revokeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Revoke Certificate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Revoking certificate <code>{activeCert?.certificateNumber}</code> will permanently mark it as revoked and bust the verification cache.
            </p>
            <form onSubmit={handleRevoke}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Revocation</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Identity discrepancy, award rescinded..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs"
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
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replacement Modal */}
      {replaceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Issue Replacement Certificate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Preserves historical audit records and issues a new valid certificate linked to <code>{activeCert?.certificateNumber}</code>.
            </p>
            <form onSubmit={handleReplace} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corrected Participant Name</label>
                <input
                  type="text"
                  required
                  value={replaceName}
                  onChange={(e) => setReplaceName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corrected Email</label>
                <input
                  type="email"
                  required
                  value={replaceEmail}
                  onChange={(e) => setReplaceEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Replacement</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Spelling correction in recipient name..."
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplaceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {submitting ? 'Issuing...' : 'Issue Replacement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
