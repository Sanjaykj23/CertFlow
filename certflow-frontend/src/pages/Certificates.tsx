import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, Download, RotateCcw, Ban, Repeat, Eye, ShieldCheck, Copy, Check } from 'lucide-react';
import { PageHeader, StatusStamp, EmptyState, PageLoading, Modal, TableSkeleton, Avatar, formatWhen } from '../components/ui';
import { CertificateCanvas } from '../components/CertificateCanvas';
import { downloadCertificate, verifyAbsoluteUrl } from '../lib/links';

export const Certificates: React.FC = () => {
  const { activeOrg } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Modals state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [viewCert, setViewCert] = useState<any>(null);
  const [activeCert, setActiveCert] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceName, setReplaceName] = useState('');
  const [replaceEmail, setReplaceEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // View modal state
  const templateCache = useRef<Record<string, any[]>>({});
  const [viewTemplate, setViewTemplate] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setModalError('');
    try {
      await api.post(`/certificates/${activeCert.id}/revoke`, { reason: revokeReason.trim() });
      setRevokeModalOpen(false);
      setRevokeReason('');
      setNotice({ kind: 'ok', text: `Certificate ${activeCert.certificateNumber} is now revoked.` });
      fetchCertificates();
    } catch (err: any) {
      setModalError(
        err.response?.data?.message || 'The certificate was not revoked. Check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCert || !replaceReason.trim()) return;
    setSubmitting(true);
    setModalError('');
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
      setNotice({ kind: 'ok', text: `A replacement for ${activeCert.certificateNumber} was issued.` });
      fetchCertificates();
    } catch (err: any) {
      setModalError(
        err.response?.data?.message || 'The replacement was not issued. Check the name and email, then try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (certId: string) => {
    setNotice(null);
    try {
      const res = await api.post(`/certificates/${certId}/resend`);
      setNotice({ kind: 'ok', text: res.data?.message || 'The certificate email was sent again.' });
      fetchCertificates();
    } catch (err: any) {
      setNotice({
        kind: 'error',
        text: err.response?.data?.message || 'The email was not sent. Check the recipient address and try again.',
      });
      fetchCertificates();
    }
  };

  const handleDownload = async (certId: string) => {
    setNotice(null);
    try {
      await downloadCertificate(certId);
    } catch (err: any) {
      setNotice({
        kind: 'error',
        text: err?.response?.data?.message || 'The PDF could not be downloaded. Try again in a moment.',
      });
    }
  };

  const openView = async (c: any) => {
    setViewCert(c);
    setViewTemplate(null);
    setCopied(false);
    const eventId = c.eventId || selectedEventId;
    if (!eventId) return;
    setViewLoading(true);
    try {
      let list = templateCache.current[eventId];
      if (!list) {
        const res = await api.get(`/events/${eventId}/templates`);
        list = Array.isArray(res.data?.data) ? res.data.data : [];
        templateCache.current[eventId] = list;
      }
      const tpl = list.find((t) => t.id === c.templateId) || list[0] || null;
      setViewTemplate(tpl);
    } catch (err) {
      console.error(err);
    } finally {
      setViewLoading(false);
    }
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const q = search.toLowerCase();
  const filtered = certificates.filter(
    (c) =>
      c.participantName.toLowerCase().includes(q) ||
      c.recipientEmail.toLowerCase().includes(q) ||
      c.certificateNumber.toLowerCase().includes(q)
  );

  const eventName = (c: any) => c.eventName || events.find((e) => e.id === (c.eventId || selectedEventId))?.name || '';
  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const closeRevoke = () => {
    setRevokeModalOpen(false);
    setModalError('');
  };
  const closeReplace = () => {
    setReplaceModalOpen(false);
    setModalError('');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Registry"
        title="Certificates"
        description="Find any issued certificate, view it, download the PDF, resend the email, replace it or revoke it."
      />

      {notice && (
        <div className={`mb-4 ${notice.kind === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">
          {notice.text}
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-paper-200/80 bg-gradient-to-b from-paper-50/80 to-white p-4 sm:grid-cols-[minmax(0,16rem)_1fr] sm:p-5">
          <div>
            <label htmlFor="cert-event" className="label">Event</label>
            <select
              id="cert-event"
              className="input"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={events.length === 0}
            >
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cert-search" className="label">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="cert-search"
                type="search"
                className="input pl-9"
                placeholder="Name, email or certificate number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {!loading && certificates.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-paper-100 px-5 py-3 text-[12px] text-ink-500">
            <span>
              <span className="num font-semibold text-ink">{filtered.length}</span>
              {filtered.length !== certificates.length && <span className="num"> of {certificates.length}</span>} shown
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-ok-500" aria-hidden="true" />
              <span className="num font-semibold text-ink">{certificates.filter((c) => c.status !== 'REVOKED' && c.status !== 'REPLACED').length}</span> valid
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-bad-500" aria-hidden="true" />
              <span className="num font-semibold text-ink">{certificates.filter((c) => c.status === 'REVOKED').length}</span> revoked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-warn-500" aria-hidden="true" />
              <span className="num font-semibold text-ink">{certificates.filter((c) => c.emailStatus === 'FAILED').length}</span> email failures
            </span>
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={6} cols={6} label="Loading certificates" />
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="ledger w-full">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Recipient</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Issued</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap font-mono text-[12px] font-medium text-ink">{c.certificateNumber}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={c.participantName} />
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{c.participantName}</p>
                          <p className="font-mono text-[11px] text-ink-500">{c.recipientEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-ink-600">{eventName(c) || '-'}</td>
                    <td>
                      <StatusStamp status={c.status} />
                    </td>
                    <td>
                      <StatusStamp status={c.emailStatus} />
                      {c.emailStatus === 'FAILED' && c.emailErrorMessage && (
                        <p className="mt-1 max-w-[220px] text-[11px] leading-tight text-bad-700" title={c.emailErrorMessage}>
                          {c.emailErrorMessage}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap font-mono text-[12px] text-ink-500">
                      {formatWhen(c.issuedAt || c.issueDate || c.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        <button type="button" className="btn-icon" title="View certificate" aria-label={`View certificate ${c.certificateNumber}`} onClick={() => openView(c)}>
                          <Eye className="h-4 w-4" />
                        </button>
                        <Link to={`/verify/${c.verificationToken}`} className="btn-icon" title="Open verification page" aria-label={`Open verification page for ${c.certificateNumber}`}>
                          <ShieldCheck className="h-4 w-4" />
                        </Link>
                        <button type="button" className="btn-icon" title="Download PDF" aria-label={`Download PDF for ${c.certificateNumber}`} onClick={() => handleDownload(c.id)}>
                          <Download className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn-icon" title="Resend email" aria-label={`Resend email for ${c.certificateNumber}`} onClick={() => handleResend(c.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        {c.status === 'VALID' && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Issue replacement"
                              aria-label={`Issue replacement for ${c.certificateNumber}`}
                              onClick={() => {
                                setActiveCert(c);
                                setReplaceName(c.participantName);
                                setReplaceEmail(c.recipientEmail);
                                setModalError('');
                                setReplaceModalOpen(true);
                              }}
                            >
                              <Repeat className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="btn-icon text-bad-700"
                              title="Revoke certificate"
                              aria-label={`Revoke certificate ${c.certificateNumber}`}
                              onClick={() => {
                                setActiveCert(c);
                                setModalError('');
                                setRevokeModalOpen(true);
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={certificates.length === 0 ? undefined : <Search className="h-5 w-5" />}
            title={certificates.length === 0 ? 'No certificates issued yet' : 'No certificates match your search'}
            description={
              certificates.length === 0
                ? 'Certificates appear here after you run a batch for this event.'
                : 'Check the spelling, or clear the search box to see every certificate for this event.'
            }
          />
        )}
      </section>

      {/* View modal */}
      <Modal
        open={!!viewCert}
        onClose={() => setViewCert(null)}
        title={viewCert ? `Certificate ${viewCert.certificateNumber}` : 'Certificate'}
        description={viewCert ? `Issued to ${viewCert.participantName}` : undefined}
        width="max-w-3xl"
        footer={
          viewCert && (
            <>
              <button type="button" className="btn-secondary" onClick={() => handleDownload(viewCert.id)}>
                <Download className="h-4 w-4" /> Download PDF
              </button>
              <button type="button" className="btn-dark" onClick={() => setViewCert(null)}>
                Close
              </button>
            </>
          )
        }
      >
        {viewCert && (
          <div className="space-y-4">
            {viewLoading ? (
              <PageLoading label="Loading template" />
            ) : (
              <div className="relative overflow-hidden rounded-lg border border-paper-200 bg-white shadow-raise">
                <CertificateCanvas
                  layout={viewTemplate?.layoutConfig}
                  values={{
                    participant_name: viewCert.participantName,
                    event_name: eventName(viewCert),
                    organization_name: viewCert.organizationName || activeOrg?.organizationName || '',
                    certificate_type: viewCert.certificateType || '',
                    issue_date: formatDate(viewCert.issuedAt || viewCert.issueDate || viewCert.createdAt),
                    certificate_number: viewCert.certificateNumber,
                  }}
                  verifyUrl={verifyAbsoluteUrl(viewCert.verificationToken)}
                  backgroundUrl={viewTemplate?.backgroundUrl}
                  className="w-full"
                />
                {viewCert.status === 'REVOKED' && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span className="-rotate-12 border-4 border-bad-500/40 px-6 py-2 font-display text-5xl font-bold uppercase tracking-widest text-bad-500/40 sm:text-7xl">
                      Revoked
                    </span>
                  </div>
                )}
              </div>
            )}
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="eyebrow mb-1">Certificate number</dt>
                <dd className="font-mono text-[13px] text-ink">{viewCert.certificateNumber}</dd>
              </div>
              <div>
                <dt className="eyebrow mb-1">Status</dt>
                <dd className="flex flex-wrap gap-1.5">
                  <StatusStamp status={viewCert.status} />
                  <StatusStamp status={viewCert.emailStatus} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="eyebrow mb-1">Verification token</dt>
                <dd className="flex items-center gap-1">
                  <span className="truncate font-mono text-[12px] text-ink-600">{viewCert.verificationToken}</span>
                  <button
                    type="button"
                    className="btn-icon shrink-0"
                    title="Copy token"
                    aria-label="Copy verification token"
                    onClick={() => copyToken(viewCert.verificationToken)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      {/* Revocation Modal */}
      <Modal
        open={revokeModalOpen}
        onClose={closeRevoke}
        title="Revoke certificate"
        description={`Revoking ${activeCert?.certificateNumber ?? ''} marks it as revoked on its public verification page. This cannot be undone.`}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeRevoke}>
              Cancel
            </button>
            <button type="submit" form="revoke-form" className="btn-danger" disabled={submitting || !revokeReason.trim()}>
              {submitting ? 'Revoking' : 'Revoke certificate'}
            </button>
          </>
        }
      >
        <form id="revoke-form" onSubmit={handleRevoke} className="space-y-3">
          {modalError && <div className="alert-error" role="alert">{modalError}</div>}
          <div>
            <label htmlFor="revoke-reason" className="label">Reason for revocation</label>
            <textarea
              id="revoke-reason"
              required
              rows={3}
              className="input"
              placeholder="Example: award rescinded after review"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
            <p className="hint">The reason is saved in the audit log.</p>
          </div>
        </form>
      </Modal>

      {/* Replacement Modal */}
      <Modal
        open={replaceModalOpen}
        onClose={closeReplace}
        title="Issue replacement"
        description={`Issues a new valid certificate linked to ${activeCert?.certificateNumber ?? ''}. The original stays in the audit history.`}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeReplace}>
              Cancel
            </button>
            <button type="submit" form="replace-form" className="btn-primary" disabled={submitting}>
              {submitting ? 'Issuing' : 'Issue replacement'}
            </button>
          </>
        }
      >
        <form id="replace-form" onSubmit={handleReplace} className="space-y-3">
          {modalError && <div className="alert-error" role="alert">{modalError}</div>}
          <div>
            <label htmlFor="replace-name" className="label">Corrected participant name</label>
            <input id="replace-name" type="text" required className="input" value={replaceName} onChange={(e) => setReplaceName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="replace-email" className="label">Corrected email</label>
            <input id="replace-email" type="email" required className="input" value={replaceEmail} onChange={(e) => setReplaceEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="replace-reason" className="label">Reason for replacement</label>
            <textarea
              id="replace-reason"
              required
              rows={2}
              className="input"
              placeholder="Example: spelling correction in the recipient name"
              value={replaceReason}
              onChange={(e) => setReplaceReason(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
