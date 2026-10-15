import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ScrollText, ShieldAlert, Clock, User } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { activeOrg } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!activeOrg) return;
      try {
        const res = await api.get(`/organizations/${activeOrg.organizationId}/audit-logs?size=100`);
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [activeOrg]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit records of sensitive operations, batch launches, revocations, and replacements.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {log.resourceType}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] max-w-md truncate">
                    {log.detailsJson || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit records logged yet. Operations such as certificate revocation or replacement will appear here.
          </div>
        )}
      </div>
    </div>
  );
};
