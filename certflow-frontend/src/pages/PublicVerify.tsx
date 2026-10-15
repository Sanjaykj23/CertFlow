import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Logo, Seal, Spinner } from '../components/ui';
import { CertificateCanvas } from '../components/CertificateCanvas';

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

const Field: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <div className="py-3">
    <dt className="eyebrow">{label}</dt>
    <dd className={`mt-1 break-words text-[15px] text-ink ${mono ? 'num text-[14px]' : ''}`}>{children}</dd>
  </div>
);

export const PublicVerify: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(`/api/v1/public/verify/${token}`);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err: any) {
        setData({
          valid: false,
          status: null,
          message: err.response?.data?.message || 'Certificate verification failed.',
        });
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  const footer = (
    <footer className="mt-10 flex flex-col gap-3 border-t border-paper-300 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-center gap-2 text-[12px] text-ink-500">
        Verified by <Logo size={20} className="!gap-1.5 [&>span:last-child]:!text-[14px]" />
      </span>
      <Link to="/login" className="rounded text-[12px] font-semibold text-seal-700 hover:underline">
        Back to CertFlow sign in
      </Link>
    </footer>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4">
        <Spinner label="Checking the registry" />
      </div>
    );
  }

  const isValid = data?.valid === true;
  const isRevoked = data?.status === 'REVOKED';
  const isReplaced = data?.status === 'REPLACED';
  const hasRecord = !!data?.certificateNumber;
  const preview = data?.preview;

  let tone: 'foil' | 'bad' | 'muted' = 'muted';
  let heading = 'Certificate not found';
  let lead = data?.message || 'No certificate matches this link. Check that you scanned the full QR code, or ask the issuer for a new copy.';
  if (isValid) {
    tone = 'foil';
    heading = 'Verified certificate';
    lead = 'The issuer registered this certificate and it is currently valid.';
  } else if (isRevoked) {
    tone = 'bad';
    heading = 'Certificate revoked';
    lead = 'The issuer has revoked this certificate. It is no longer valid.';
  } else if (isReplaced) {
    tone = 'bad';
    heading = 'Certificate superseded';
    lead = 'The issuer replaced this certificate with a newer one. This copy is no longer valid. Ask the holder for the current certificate.';
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Logo />
        </div>

        <section className="panel guilloche overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-paper-200 p-6 sm:flex-row sm:items-center sm:p-8">
            <Seal size={tone === 'muted' ? 72 : 96} tone={tone} mark={tone === 'foil' ? 'check' : 'cross'} />
            <div className="min-w-0">
              <p className="eyebrow mb-1.5">
                {isValid ? 'Registry check passed' : hasRecord ? 'Registry check failed' : 'Registry check'}
              </p>
              <h1 className="page-title">{heading}</h1>
              <p className="page-lead">{lead}</p>
            </div>
          </div>

          {hasRecord && (
            <div className="p-6 sm:p-8">
              <dl className="grid divide-y divide-paper-200 sm:grid-cols-2 sm:gap-x-10 sm:divide-y-0">
                <Field label="Recipient">
                  <span className="font-display text-[20px] font-semibold">{data.participantName}</span>
                </Field>
                <Field label="Event or achievement">{data.eventName}</Field>
                <Field label="Issuing organization">{data.organizationName}</Field>
                <Field label="Issue date">{fmtDate(data.issueDate)}</Field>
                <Field label="Certificate number" mono>{data.certificateNumber}</Field>
                {(isRevoked || isReplaced) && data.revokedAt && (
                  <Field label={isRevoked ? 'Revoked on' : 'Replaced on'}>{fmtDate(data.revokedAt)}</Field>
                )}
              </dl>

              {(isRevoked || isReplaced) && data.revocationReason && (
                <div className="alert-error mt-4">
                  <span>
                    <span className="font-semibold">Reason given by the issuer: </span>
                    {data.revocationReason}
                  </span>
                </div>
              )}

              <p className="mt-5 text-[12px] leading-relaxed text-ink-500">
                This page shows only public details. Contact information and internal records stay private.
              </p>
            </div>
          )}
        </section>

        {preview?.layoutConfig && (
          <section className="mt-8" aria-label="Certificate proof">
            <p className="eyebrow mb-2">Certificate proof</p>
            <div className="relative overflow-hidden border border-ink-300 bg-white p-2 sm:p-3">
              <CertificateCanvas
                layout={preview.layoutConfig}
                values={preview.values}
                verifyUrl={window.location.href}
                className="h-auto w-full"
              />
              {isRevoked && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
                  <span className="-rotate-[20deg] select-none rounded border-4 border-bad-500/40 px-5 py-1 font-display text-[clamp(40px,12vw,120px)] font-bold uppercase tracking-widest text-bad-500/30">
                    Revoked
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {footer}
      </div>
    </div>
  );
};
