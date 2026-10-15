import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { isDemo } from '../lib/env';
import { Logo, Seal, Modal } from '../components/ui';
import { ArrowRight, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const STEPS = [
  { n: '01', title: 'Import roster', body: 'Upload a CSV of recipients and map the columns.' },
  { n: '02', title: 'Render and deliver', body: 'Each certificate is drawn from your layout and emailed.' },
  { n: '03', title: 'Verify by QR', body: 'Anyone who scans the code sees the public record.' },
];

/** Shared two-panel shell used by Login and Register. */
export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-paper lg:flex-row">
    <aside className="guilloche relative bg-ink text-white lg:flex lg:w-[44%] lg:max-w-[600px] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
      <div className="flex items-center justify-between px-4 py-4 sm:px-8 lg:p-0">
        <Logo inverted />
        <span className="eyebrow !text-ink-300 lg:hidden">Certificates, verified</span>
      </div>
      <div className="hidden lg:block">
        <Seal size={96} tone="foil" />
        <h1 className="mt-8 max-w-sm font-display text-[34px] font-semibold leading-[1.1] tracking-tight text-white">
          Issue certificates in bulk. Let anyone verify them in seconds.
        </h1>
        <ol className="mt-10 space-y-5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="num pt-0.5 text-[12px] text-foil-400">{s.n}</span>
              <div>
                <p className="font-display text-[15px] font-semibold">{s.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-300">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="eyebrow hidden !text-ink-400 lg:block">How a certificate travels</p>
    </aside>
    <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:py-12">
      <div className="w-full max-w-[420px]">{children}</div>
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
        <div className="panel-muted mt-6 p-4">
          <p className="eyebrow">Demo account</p>
          <dl className="mt-2 space-y-1 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-16 text-ink-500">Email</dt>
              <dd className="num break-all text-ink">demo@certflow.dev</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 text-ink-500">Password</dt>
              <dd className="num text-ink">Demo@1234</dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn-secondary btn-sm mt-3"
            onClick={() => {
              setEmail('demo@certflow.dev');
              setPassword('Demo@1234');
            }}
          >
            Fill in demo credentials
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
                    Demo code: <span className="num font-semibold">{demoOtp}</span>
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
