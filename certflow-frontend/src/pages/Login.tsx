import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Award, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotMsg(`A 6-digit reset code was sent to ${forgotEmail}. Please check your inbox.`);
      setForgotStep('VERIFY');
    } catch (err: any) {
      setForgotErr(err.response?.data?.message || 'Failed to send reset code. Please verify your email.');
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
      alert('Password updated successfully! You can now log in with your new password.');
      setShowForgotModal(false);
      setForgotStep('REQUEST');
      setEmail(forgotEmail);
    } catch (err: any) {
      setForgotErr(err.response?.data?.message || 'Invalid or expired reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
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
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">CertFlow</h2>
        <p className="mt-1 text-sm text-slate-400">Distributed Certificate Generation & Delivery Platform</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="organizer@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-brand-600 to-sky-500 text-white text-sm font-semibold rounded-xl hover:from-brand-500 hover:to-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-lg shadow-brand-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign in to Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@certflow.io');
                setPassword('Password123!');
              }}
              className="text-sky-400 hover:text-sky-300 font-medium hover:underline cursor-pointer"
            >
              ⚡ Fill Demo Login (admin@certflow.io)
            </button>
            <Link to="/register" className="font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-2">
              Register here
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reset Password</h3>
            <p className="text-xs text-slate-400">
              {forgotStep === 'REQUEST'
                ? 'Enter your account email to receive a 6-digit reset code.'
                : `Enter the 6-digit code sent to ${forgotEmail} along with your new password.`}
            </p>

            {forgotMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs">
                {forgotMsg}
              </div>
            )}
            {forgotErr && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs">
                {forgotErr}
              </div>
            )}

            {forgotStep === 'REQUEST' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="Enter your account email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-500 cursor-pointer"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-3">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-Digit OTP Code"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-center font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="New Password (min 8 chars)"
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('REQUEST')}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-600 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 cursor-pointer"
                  >
                    {forgotLoading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
