import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Award, Lock, Mail, User, Building2, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

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
        setStep('OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
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
      setError(err.response?.data?.message || 'Verification failed. Please ensure the code is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', {
        fullName,
        email,
        password,
        organizationName,
      });
      setSuccessMsg(`A new code was sent to ${email}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 bg-gradient-to-tr from-brand-600 to-sky-400 rounded-xl mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
          <Award className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">Create your Account</h2>
        <p className="mt-1 text-sm text-slate-400">
          {step === 'DETAILS' ? 'Launch and distribute thousands of certificates in seconds' : 'Verify your email to activate your account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'DETAILS' ? (
            <form className="space-y-4" onSubmit={handleRequestOtp}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="organizer@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Organization Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. National Hackathon Council"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password (min 8 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-brand-600 to-sky-500 text-white text-sm font-semibold rounded-xl hover:from-brand-500 hover:to-sky-400 focus:outline-none shadow-lg shadow-brand-600/30 transition disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? 'Sending Verification Code...' : 'Send Verification OTP'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter 6-Digit Email Code sent to <strong className="text-sky-400">{email}</strong>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-9 pr-3.5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-lg font-mono tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-400 focus:outline-none shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify Email & Create Account'}
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setStep('DETAILS')}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  ← Edit Information
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-2">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
