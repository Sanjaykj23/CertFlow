import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, ShieldCheck, ShieldX, ShieldQuestion, Clock } from 'lucide-react';
import { Logo, Seal } from '../components/ui';
import { CertificateCanvas } from '../components/CertificateCanvas';

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

const Field: React.FC<{ label: string; children: React.ReactNode; mono?: boolean; wide?: boolean }> = ({ label, children, mono, wide }) => (
  <div className={`py-3.5 ${wide ? 'sm:col-span-2' : ''}`}>
    <dt className="eyebrow">{label}</dt>
    <dd className={`mt-1.5 break-words text-[15px] text-ink ${mono ? 'num text-[14px]' : ''}`}>{children}</dd>
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
    <footer className="mt-10 flex flex-col gap-3 border-t border-paper-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-4" role="status">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-seal-500/20 motion-safe:animate-ping" aria-hidden="true" />
          <Seal size={64} tone="seal" mark="none" className="relative motion-safe:animate-spin-slow" />
        </div>
        <p className="eyebrow">Checking the registry</p>
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

  const band =
    tone === 'foil'
      ? 'hero-ink text-white'
      : tone === 'bad'
      ? 'bg-gradient-to-br from-[#3A1410] via-[#5A1D16] to-[#2A1B1F] text-white'
      : 'bg-gradient-to-br from-paper-100 to-white text-ink';
  const StatusIcon = isValid ? ShieldCheck : hasRecord ? ShieldX : ShieldQuestion;
  const checkedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl animate-fade-up">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-paper-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-ink-600 shadow-panel backdrop-blur">
            <Lock className="h-3 w-3 text-seal-600" aria-hidden="true" />
            Public verification
          </span>
        </div>

        <section className="overflow-hidden rounded-[18px] border border-paper-200 bg-white shadow-lift">
          <div className={`relative isolate overflow-hidden ${band}`}>
            {tone !== 'muted' && <div className="guilloche-light absolute inset-0 -z-10" aria-hidden="true" />}
            {tone === 'foil' && (
              <div className="pointer-events-none absolute -right-24 -top-24 -z-10 opacity-[0.12]" aria-hidden="true">
                <Seal size={320} tone="foil" mark="none" />
              </div>
            )}
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
              <div className="relative shrink-0 motion-safe:animate-stamp-in">
                {tone === 'foil' && <span className="absolute -inset-3 rounded-full bg-foil-400/25 blur-xl" aria-hidden="true" />}
                <Seal size={tone === 'muted' ? 80 : 112} tone={tone} mark={tone === 'foil' ? 'check' : 'cross'} className="relative drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]" />
              </div>
              <div className="min-w-0">
                <p
                  className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] ${
                    tone === 'foil'
                      ? 'bg-ok-500/20 text-[#9BE3BA] ring-1 ring-ok-500/40'
                      : tone === 'bad'
                      ? 'bg-bad-500/25 text-[#F7B8B0] ring-1 ring-bad-500/50'
                      : 'bg-paper-200 text-ink-500'
                  }`}
                >
                  <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {isValid ? 'Registry check passed' : hasRecord ? 'Registry check failed' : 'Registry check'}
                </p>
                <h1 className={`font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px] ${tone === 'muted' ? 'text-ink' : 'text-white'}`}>
                  {heading}
                </h1>
                <p className={`mt-2 max-w-xl text-[14px] leading-relaxed ${tone === 'muted' ? 'text-ink-500' : 'text-white/70'}`}>{lead}</p>
              </div>
            </div>
          </div>

          {hasRecord && (
            <div className="p-6 sm:p-10 sm:pt-8">
              <dl className="grid divide-y divide-dashed divide-paper-200 sm:grid-cols-2 sm:gap-x-10 [&>div]:border-paper-200 sm:[&>div]:border-b sm:[&>div]:border-dashed">
                <Field label="Recipient" wide>
                  <span className="font-display text-[26px] font-semibold tracking-tight">{data.participantName}</span>
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

              <div className="mt-6 flex flex-col gap-2 rounded-lg bg-paper-50 px-4 py-3 text-[12px] leading-relaxed text-ink-500 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                  This page shows only public details. Contact information and internal records stay private.
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-ink-400">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Checked {checkedAt}
                </span>
              </div>
            </div>
          )}
        </section>

        {preview?.layoutConfig && (
          <section className="mt-8" aria-label="Certificate proof">
            <p className="eyebrow mb-3 flex items-center gap-2">
              <span className="h-px w-4 bg-seal-500/60" aria-hidden="true" />
              Certificate proof
            </p>
            <div className="rounded-[18px] border border-paper-200 bg-gradient-to-br from-paper-100 via-white to-paper-100 p-3 shadow-raise sm:p-6">
            <div className="relative overflow-hidden rounded-[4px] bg-white shadow-lift ring-1 ring-ink/5">
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
            </div>
          </section>
        )}

        {footer}
      </div>
    </div>
  );
};
