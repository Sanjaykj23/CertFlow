import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Upload, Palette, Download, RotateCcw, Ban, ExternalLink } from 'lucide-react';
import api from '../api/client';
import { CertificateCanvas } from '../components/CertificateCanvas';
import { EmptyState, Modal, PageHeader, PageLoading, StatusStamp } from '../components/ui';
import { downloadCertificate } from '../lib/links';

export const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Revocation modal state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

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

  const closeRevoke = () => {
    setRevokeModalOpen(false);
    setRevokeError('');
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertId || !revokeReason.trim()) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await api.post(`/certificates/${selectedCertId}/revoke`, { reason: revokeReason.trim() });
      setRevokeModalOpen(false);
      setRevokeReason('');
      fetchEventData();
    } catch (err: any) {
      setRevokeError(err.response?.data?.message || 'The certificate was not revoked. Check your connection and try again.');
    } finally {
      setRevoking(false);
    }
  };

  const handleResend = async (certId: string) => {
    setNotice(null);
    try {
      await api.post(`/certificates/${certId}/resend`);
      setNotice({ kind: 'ok', text: 'Email resend queued. The email status updates once it is delivered.' });
      fetchEventData();
    } catch (err: any) {
      setNotice({ kind: 'error', text: err.response?.data?.message || 'The email was not queued. Check the recipient address and try again.' });
    }
  };

  const handleDownload = async (certId: string) => {
    setNotice(null);
    try {
      await downloadCertificate(certId);
    } catch (err: any) {
      setNotice({ kind: 'error', text: err?.response?.data?.message || 'The PDF did not download. Try again in a moment.' });
    }
  };

  if (loading && !event) {
    return <PageLoading label="Loading event" />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ to: '/events', label: 'All events' }}
        eyebrow={`Event / ${event?.eventDate || ''}`}
        title={event?.name}
        description={event?.description || 'No description provided.'}
        actions={
          <>
            <StatusStamp status={event?.archived ? 'DRAFT' : 'ACTIVE'} label={event?.archived ? 'Archived' : 'Active'} />
            <Link to={`/events/${eventId}/templates/builder`} className="btn-secondary">
              <Palette className="h-4 w-4" />
              Template designer
            </Link>
            <Link to={`/events/${eventId}/import-csv`} className="btn-primary">
              <Upload className="h-4 w-4" />
              Issue batch
            </Link>
          </>
        }
      />

      {notice && (
        <div className={notice.kind === 'ok' ? 'alert-ok' : 'alert-error'} role={notice.kind === 'ok' ? 'status' : 'alert'}>
          {notice.text}
        </div>
      )}

      {/* Template */}
      <section className="panel" aria-labelledby="sec-template">
        <div className="panel-head">
          <div>
            <p className="eyebrow">01 Template</p>
            <h2 id="sec-template" className="panel-title mt-1">Certificate template</h2>
          </div>
        </div>
        {templates.length > 0 ? (
          <ul className="divide-y divide-paper-200">
            {templates.map((tpl) => (
              <li key={tpl.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                {tpl.layoutConfig && (
                  <div className="w-full shrink-0 overflow-hidden rounded-md border border-paper-200 sm:w-48">
                    <CertificateCanvas layout={tpl.layoutConfig} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="eyebrow num">
                    {tpl.orientation} / v{tpl.version}
                  </p>
                  <h3 className="mt-1 font-display text-[16px] font-semibold text-ink">{tpl.name}</h3>
                  <p className="mt-1 text-[12px] text-ink-500">
                    <span className="num">{tpl.width} x {tpl.height}</span> pt, with{' '}
                    <span className="num">{tpl.layoutConfig?.textElements?.length || 0}</span> placeholder elements.
                  </p>
                </div>
                <Link to={`/events/${eventId}/templates/builder?templateId=${tpl.id}`} className="btn-secondary btn-sm self-start sm:self-center">
                  Edit template
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No template yet"
            description="Design the certificate layout before you issue a batch."
            action={
              <Link to={`/events/${eventId}/templates/builder`} className="btn-primary">
                <Palette className="h-4 w-4" />
                Open the template builder
              </Link>
            }
          />
        )}
      </section>

      {/* Batches */}
      <section className="panel" aria-labelledby="sec-batches">
        <div className="panel-head">
          <div>
            <p className="eyebrow">02 Batches</p>
            <h2 id="sec-batches" className="panel-title mt-1">
              Batches <span className="num text-ink-400">({batches.length})</span>
            </h2>
          </div>
          <Link to={`/events/${eventId}/import-csv`} className="btn-secondary btn-sm">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Link>
        </div>
        {batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Status</th>
                  <th className="min-w-[140px]">Progress</th>
                  <th>Generated</th>
                  <th>Emailed</th>
                  <th>Failed</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const pct = b.totalCount > 0 ? Math.round(((b.generatedCount + b.failedCount) / b.totalCount) * 100) : 0;
                  return (
                    <tr key={b.id}>
                      <td className="font-medium text-ink">{b.name}</td>
                      <td><StatusStamp status={b.status} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="meter"><span style={{ width: `${pct}%` }} /></div>
                          <span className="num text-[12px] text-ink-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="num text-[12px]">{b.generatedCount} / {b.totalCount}</td>
                      <td className="num text-[12px]">{b.emailSentCount} / {b.totalCount}</td>
                      <td className={`num text-[12px] ${b.failedCount > 0 ? 'text-bad-700' : ''}`}>{b.failedCount}</td>
                      <td className="text-right">
                        <Link to={`/batches/${b.id}/progress`} className="btn-ghost btn-sm">Live monitor</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No batches issued yet"
            description="Upload a CSV of participant names and emails to issue certificates."
            action={
              <Link to={`/events/${eventId}/import-csv`} className="btn-primary">
                <Upload className="h-4 w-4" />
                Import participants CSV
              </Link>
            }
          />
        )}
      </section>

      {/* Certificates */}
      <section className="panel" aria-labelledby="sec-certs">
        <div className="panel-head">
          <div>
            <p className="eyebrow">03 Certificates</p>
            <h2 id="sec-certs" className="panel-title mt-1">
              Issued certificates <span className="num text-ink-400">({certificates.length})</span>
            </h2>
          </div>
        </div>
        {certificates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Validity</th>
                  <th>Email</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id}>
                    <td className="num whitespace-nowrap text-[12px] font-medium text-ink">{c.certificateNumber}</td>
                    <td className="min-w-[160px]">
                      <span className="font-medium text-ink">{c.participantName}</span>
                      <p className="text-[12px] text-ink-500">{c.recipientEmail}</p>
                    </td>
                    <td className="text-[12px]">{c.certificateType}</td>
                    <td><StatusStamp status={c.status} /></td>
                    <td><StatusStamp status={c.emailStatus} /></td>
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        <Link to={`/verify/${c.verificationToken}`} className="btn-icon" title="View verification page" aria-label={`View verification page for ${c.certificateNumber}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button type="button" onClick={() => handleDownload(c.id)} className="btn-icon" title="Download PDF" aria-label={`Download PDF for ${c.certificateNumber}`}>
                          <Download className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleResend(c.id)} className="btn-icon" title="Resend email" aria-label={`Resend email for ${c.certificateNumber}`}>
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        {c.status === 'VALID' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCertId(c.id);
                              setRevokeError('');
                              setRevokeModalOpen(true);
                            }}
                            className="btn-icon text-bad-700"
                            title="Revoke certificate"
                            aria-label={`Revoke ${c.certificateNumber}`}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No certificates yet" description="Certificates appear here as soon as a batch generates them." />
        )}
      </section>

      <Modal
        open={revokeModalOpen}
        onClose={closeRevoke}
        title="Revoke certificate"
        description="Revoking removes the certificate from the public verification cache and marks it invalid."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeRevoke}>Cancel</button>
            <button type="submit" form="revoke-form" className="btn-danger" disabled={revoking}>
              {revoking ? 'Revoking' : 'Confirm revocation'}
            </button>
          </>
        }
      >
        <form id="revoke-form" onSubmit={handleRevoke} className="space-y-3">
          {revokeError && <div className="alert-error" role="alert">{revokeError}</div>}
          <div>
            <label htmlFor="revoke-reason" className="label">Reason for revocation</label>
            <textarea
              id="revoke-reason"
              required
              rows={3}
              placeholder="Issued in error, or disqualified for a rule violation"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="input h-auto py-2"
            />
            <p className="hint">The reason is stored with the revocation record.</p>
          </div>
        </form>
      </Modal>
    </div>
  );
};
