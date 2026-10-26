import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { AuthShell } from './Login';
import { AlertCircle, CheckCircle2, Info, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        fullName,
        email,
        password,
        organizationName,
      });

      if (res.data.success) {
        setSuccessMsg(`We sent a 6-digit verification code to ${email}. Please check your inbox.`);
        setDemoOtp(res.data.data?.demoOtp ? String(res.data.data.demoOtp) : null);
        setStep('OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        otp: otp.trim(),
      });

      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        fullName,
        email,
        password,
        organizationName,
      });
      setSuccessMsg(`A new code was sent to ${email}`);
      if (res.data?.data?.demoOtp) setDemoOtp(String(res.data.data.demoOtp));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not resend the code. Wait a moment and try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: 'DETAILS', label: 'Details' },
    { key: 'OTP', label: 'Verify email' },
  ];
  const current = step === 'DETAILS' ? 0 : 1;

  return (
    <AuthShell>
      <ol className="mb-6 flex items-center gap-3" aria-label="Registration steps">
        {steps.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2" aria-current={i === current ? 'step' : undefined}>
            <span
              className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                i < current
                  ? 'border-seal-600 bg-seal-600 text-white'
                  : i === current
                  ? 'border-ink bg-ink text-white'
                  : 'border-paper-300 text-ink-400'
              }`}
            >
              {i < current ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`text-[12px] font-semibold ${i === current ? 'text-ink' : 'text-ink-400'}`}>{s.label}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-paper-300" />}
          </li>
        ))}
      </ol>

      <h2 className="page-title">{step === 'DETAILS' ? 'Create your account' : 'Verify your email'}</h2>
      <p className="page-lead">
        {step === 'DETAILS'
          ? 'Set up your organization and start issuing certificates.'
          : 'Enter the code we emailed you to activate the account.'}
      </p>

      <div className="mt-6 space-y-4">
        {error && (
          <div className="alert-error" role="alert">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert-ok" role="status">
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'DETAILS' ? (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
            <div>
              <label htmlFor="reg-name" className="label">Full name</label>
              <input id="reg-name" type="text" required autoComplete="name" placeholder="Dr. Rajesh Kumar"
                value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="reg-email" className="label">Work email</label>
              <input id="reg-email" type="email" required autoComplete="email" placeholder="organizer@university.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="reg-org" className="label">Organization name</label>
              <input id="reg-org" type="text" required autoComplete="organization" placeholder="National Hackathon Council"
                value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <input id="reg-password" type="password" required minLength={8} autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
              <p className="hint">Use at least 8 characters.</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary h-10 w-full">
              {loading ? 'Sending code...' : 'Send verification code'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div>
              <label htmlFor="reg-otp" className="label">
                6-digit code sent to <span className="font-mono">{email}</span>
              </label>
              <input
                id="reg-otp"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                className="input num h-12 text-center text-[20px] tracking-[0.4em]"
              />
            </div>

            {demoOtp && (
              <div className="alert-info items-center justify-between">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  Verification code: <span className="num font-semibold">{demoOtp}</span>
                </span>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setOtp(demoOtp.replace(/[^0-9]/g, '').slice(0, 6))}>
                  Use this code
                </button>
              </div>
            )}

            <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary h-10 w-full">
              {loading ? 'Verifying...' : 'Verify email and create account'}
            </button>

            <div className="flex items-center justify-between text-[13px]">
              <button type="button" onClick={() => setStep('DETAILS')} className="rounded font-semibold text-ink-500 hover:text-ink">
                Edit details
              </button>
              <button type="button" onClick={handleResendOtp} disabled={loading}
                className="rounded font-semibold text-seal-700 hover:underline disabled:opacity-50">
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="mt-6 text-[13px] text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="rounded font-semibold text-seal-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};
