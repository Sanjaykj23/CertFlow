import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Calendar,
  Building2,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-400">Verifying cryptographic certificate authenticity...</p>
        </div>
      </div>
    );
  }

  const isValid = data?.valid === true;
  const isRevoked = data?.status === 'REVOKED';
  const isReplaced = data?.status === 'REPLACED';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-tr from-brand-600 to-sky-400 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="mt-3 text-2xl font-black text-white tracking-tight">CertFlow Official Registry</h2>
          <p className="text-xs text-slate-400">Cryptographic Verification & Authenticity Portal</p>
        </div>

        {/* Verification Status Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Status Badge */}
          <div className="text-center space-y-2">
            {isValid ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-sm shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>OFFICIAL & VALID</span>
              </div>
            ) : isRevoked ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 font-bold text-sm shadow-sm">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>CERTIFICATE REVOKED</span>
              </div>
            ) : isReplaced ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 font-bold text-sm shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>SUPERSEDED / REPLACED</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-600 text-slate-400 font-bold text-sm">
                <XCircle className="w-4 h-4 text-slate-400" />
                <span>NOT FOUND / INVALID</span>
              </div>
            )}

            <p className="text-xs text-slate-300 max-w-xs mx-auto pt-1">
              {data?.message}
            </p>
          </div>

          {/* Certificate Public Metadata */}
          {data?.certificateNumber && (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-700/60 p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Recipient Name
                </span>
                <p className="text-base font-bold text-white mt-0.5">{data.participantName}</p>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Event / Achievement
                </span>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">{data.eventName}</p>
              </div>

              <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Issuing Organization
                  </span>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">{data.organizationName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Issue Date
                  </span>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">
                    {data.issueDate ? new Date(data.issueDate).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Certificate ID
                </span>
                <p className="text-xs font-mono font-bold text-brand-400 mt-0.5">
                  {data.certificateNumber}
                </p>
              </div>

              {isRevoked && data.revocationReason && (
                <div className="border-t border-rose-900/50 pt-3 bg-rose-950/20 p-2.5 rounded-lg border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Revocation Details
                  </span>
                  <p className="text-xs text-rose-300 mt-0.5 font-medium">{data.revocationReason}</p>
                  {data.revokedAt && (
                    <span className="text-[10px] text-rose-400/80 block mt-1">
                      Revoked on {new Date(data.revokedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Privacy Note */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              🔒 Verified by CertFlow tamper-evident registry. Private personal contact information and internal keys are never exposed publicly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
