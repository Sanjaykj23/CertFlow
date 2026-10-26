import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { isDemo } from '../lib/env';
import { Logo, Seal, Modal } from '../components/ui';
import { ArrowRight, CheckCircle2, AlertCircle, Info, ShieldCheck, ScanLine, KeyRound } from 'lucide-react';

const STEPS = [
  { n: '01', title: 'Import roster', body: 'Upload a CSV of recipients and map the columns.' },
  { n: '02', title: 'Render and deliver', body: 'Each certificate is drawn from your layout and emailed.' },
  { n: '03', title: 'Verify by QR', body: 'Anyone who scans the code sees the public record.' },
];

/** A decorative QR-like matrix: finder squares plus a fixed pseudo-random fill. */
const QrMark: React.FC<{ size?: number; className?: string }> = ({ size = 56, className = '' }) => {
  const n = 21;
  const cells: React.ReactNode[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = rnd();
      if (inFinder(x, y)) continue;
      if (r > 0.52) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />
      <g fill="#0F1A2B">
        {cells}
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
      </g>
    </svg>
  );
};

/** The composed certificate illustration shown beside the auth forms. */
const CertificateArt: React.FC = () => (
  <div className="relative mx-auto w-full max-w-[440px] select-none" aria-hidden="true">
    {/* glow */}
    <div className="absolute -inset-10 rounded-full bg-seal-500/25 blur-3xl" />
    {/* back sheet */}
    <div className="absolute inset-0 translate-x-6 translate-y-5 rotate-[5deg] rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm" />
    {/* front sheet */}
    <div className="relative motion-safe:animate-float">
      <div className="relative aspect-[1.414/1] rounded-xl bg-[#FBF8F1] p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.4)]">
        <div className="guilloche absolute inset-0 rounded-xl opacity-70" />
        <div className="relative flex h-full flex-col items-center rounded-md border border-foil-500/40 p-1">
          <div className="flex h-full w-full flex-col items-center rounded-[3px] border border-foil-500/25 px-6 pt-5 text-center">
            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-foil-600">CertFlow Academy</p>
            <p className="mt-2 font-serif text-[19px] font-semibold uppercase tracking-[0.12em] text-ink">Certificate</p>
            <p className="font-mono text-[7.5px] uppercase tracking-[0.35em] text-ink-500">of achievement</p>
            <p className="mt-3 text-[8px] uppercase tracking-[0.2em] text-ink-400">Proudly presented to</p>
            <p className="mt-1 font-serif text-[24px] italic leading-tight text-seal-700">Ananya Rao</p>
            <span className="mt-1 h-px w-40 bg-gradient-to-r from-transparent via-foil-500/60 to-transparent" />
            <p className="mt-1.5 max-w-[230px] text-[8px] leading-relaxed text-ink-500">
              for outstanding work at the National AI Hackathon 2026
            </p>
            <div className="mt-auto flex w-full items-end justify-between pb-3">
              <div className="flex items-center gap-2">
                <Seal size={40} tone="foil" />
                <div className="text-left">
                  <span className="block h-px w-16 bg-ink-300" />
                  <span className="mt-1 block font-mono text-[6.5px] uppercase tracking-wider text-ink-400">Registrar</span>
                </div>
              </div>
              <div className="text-right">
                <QrMark size={44} className="ml-auto rounded-sm" />
                <span className="mt-1 block font-mono text-[6.5px] tracking-wider text-ink-400">CF-2026-000149</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* verification chip */}
      <div className="absolute -bottom-6 -right-4 flex items-center gap-2.5 rounded-xl border border-white/15 bg-ink/80 py-2.5 pl-2.5 pr-4 shadow-pop backdrop-blur-md sm:-right-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ok-500/20 ring-1 ring-ok-500/40">
          <ShieldCheck className="h-4 w-4 text-[#7FD8A6]" />
        </span>
        <span>
          <span className="block text-[12px] font-semibold text-white">Valid certificate</span>
          <span className="block font-mono text-[10px] text-white/50">Registry check passed</span>
        </span>
      </div>
      {/* scan chip */}
      <div className="absolute -left-6 top-8 hidden items-center gap-2 rounded-full border border-white/15 bg-ink/80 px-3 py-1.5 text-[11px] font-semibold text-white/85 shadow-pop backdrop-blur-md xl:flex">
        <ScanLine className="h-3.5 w-3.5 text-foil-400" />
        Scan to verify
      </div>
    </div>
  </div>
);

/** Shared two-panel shell used by Login and Register. */
export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen flex-col lg:flex-row">
    <aside className="hero-ink relative isolate overflow-hidden text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[48%] lg:max-w-[680px] lg:flex-col lg:justify-between lg:px-12 lg:py-10">
      <div className="guilloche-light absolute inset-0 -z-10" aria-hidden="true" />
      <div className="flex items-center justify-between px-4 py-4 sm:px-8 lg:p-0">
        <Logo inverted />
        <span className="eyebrow !text-ink-300 lg:hidden">Certificates, verified</span>
      </div>
      <div className="hidden lg:block">
        <h1 className="max-w-md font-display text-[36px] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
          Issue certificates in bulk. <span className="text-foil-gradient">Let anyone verify them in seconds.</span>
        </h1>
        <div className="mt-14 px-6">
          <CertificateArt />
        </div>
      </div>
      <ol className="hidden grid-cols-3 gap-5 border-t border-white/10 pt-6 lg:grid">
        {STEPS.map((s) => (
          <li key={s.n}>
            <span className="num text-[11px] text-foil-400">{s.n}</span>
            <p className="mt-1 font-display text-[14px] font-semibold">{s.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-300">{s.body}</p>
          </li>
        ))}
      </ol>
    </aside>
    <main className="relative flex flex-1 items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:py-12">
      <div className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="w-full max-w-[440px] animate-fade-up sm:rounded-[18px] sm:border sm:border-paper-200 sm:bg-white sm:p-9 sm:shadow-lift">{children}</div>
    </main>
  </div>
);

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotMsg(`A 6-digit reset code was sent to ${forgotEmail}. Please check your inbox.`);
      setDemoOtp(res.data?.data?.demoOtp ? '123456' : null);
      setForgotStep('VERIFY');
    } catch (err: any) {
      setForgotErr(err.response?.data?.message || 'Failed to send reset code. Check the email address and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPass,
      });
      setResetDone(true);
      setShowForgotModal(false);
      setForgotStep('REQUEST');
      setEmail(forgotEmail);
    } catch (err: any) {
      setForgotErr(err.response?.data?.message || 'The reset code is invalid or expired. Request a new code and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetDone(false);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Check both and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <p className="eyebrow mb-2">Sign in</p>
      <h2 className="page-title">Welcome back</h2>
      <p className="page-lead">Sign in to manage events, rosters and issued certificates.</p>

      {isDemo && (
        <div className="relative mt-6 overflow-hidden rounded-xl border border-seal-100 bg-gradient-to-br from-seal-50 to-white p-4">
          <p className="eyebrow flex items-center gap-1.5 !text-seal-700">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Quick sign-in
          </p>
          <dl className="mt-2 space-y-1 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-16 text-ink-500">Email</dt>
              <dd className="num break-all text-ink">organizer@certflow.app</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 text-ink-500">Password</dt>
              <dd className="num text-ink">CertFlow@2026</dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn-primary btn-sm mt-3"
            onClick={() => {
              setEmail('organizer@certflow.app');
              setPassword('CertFlow@2026');
            }}
          >
            Use sample account
          </button>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {resetDone && (
          <div className="alert-ok" role="status">
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
            <span>Password updated. Sign in with your new password.</span>
          </div>
        )}
        {error && (
          <div className="alert-error" role="alert">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="label">Work email</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="organizer@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="!mb-0 label">Password</label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="rounded text-[12px] font-semibold text-seal-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary h-10 w-full">
          {loading ? 'Signing in...' : 'Sign in'}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-6 text-[13px] text-ink-500">
        New to CertFlow?{' '}
        <Link to="/register" className="rounded font-semibold text-seal-700 hover:underline">
          Create an account
        </Link>
      </p>

      <Modal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset password"
        description={
          forgotStep === 'REQUEST'
            ? 'Enter your account email to receive a 6-digit reset code.'
            : `Enter the 6-digit code sent to ${forgotEmail} and choose a new password.`
        }
      >
        <div className="space-y-3">
          {forgotMsg && (
            <div className="alert-ok" role="status">
              <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
              <span>{forgotMsg}</span>
            </div>
          )}
          {forgotErr && (
            <div className="alert-error" role="alert">
              <AlertCircle className="mt-px h-4 w-4 shrink-0" />
              <span>{forgotErr}</span>
            </div>
          )}

          {forgotStep === 'REQUEST' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="label">Account email</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForgotModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={forgotLoading} className="btn-primary">
                  {forgotLoading ? 'Sending...' : 'Send reset code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              {demoOtp && (
                <div className="alert-info items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    Verification code: <span className="num font-semibold">{demoOtp}</span>
                  </span>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setForgotOtp(demoOtp)}>
                    Use this code
                  </button>
                </div>
              )}
              <div>
                <label htmlFor="forgot-otp" className="label">6-digit code</label>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  className="input num tracking-[0.3em]"
                />
              </div>
              <div>
                <label htmlFor="forgot-new" className="label">New password</label>
                <input
                  id="forgot-new"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  className="input"
                />
                <p className="hint">Use at least 8 characters.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setForgotStep('REQUEST')} className="btn-secondary">
                  Back
                </button>
                <button type="submit" disabled={forgotLoading} className="btn-primary">
                  {forgotLoading ? 'Updating...' : 'Set new password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </AuthShell>
  );
};
