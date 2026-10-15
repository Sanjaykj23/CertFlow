import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, Mail } from 'lucide-react';

export const Members: React.FC = () => {
  const { activeOrg } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    if (!activeOrg) return;
    try {
      const res = await api.get(`/organizations/${activeOrg.organizationId}/members`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setMembers(res.data.data);
      }
    } catch {
      setMembers([
        {
          id: '1',
          name: 'Organizer',
          email: 'admin@certflow.io',
          role: activeOrg?.role || 'OWNER',
          joinedAt: new Date().toISOString(),
        },
      ]);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrg]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !activeOrg) return;
    setLoading(true);
    try {
      await api.post(`/organizations/${activeOrg.organizationId}/members`, {
        email: email.trim(),
        role,
      });
      alert('Member added successfully!');
      setShowAddModal(false);
      setEmail('');
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Team & Roles</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage teammates with role-based access control (OWNER, ADMIN, OPERATOR, VIEWER).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow-sm transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Permissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/50 transition">
                <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold">{m.name}</p>
                    <p className="text-slate-400 font-normal text-[11px]">{m.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold text-[10px] border border-sky-200">
                    {m.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 text-[11px]">
                  {m.role === 'OWNER' ? 'Full workspace administration, billing, team, and events' :
                   m.role === 'ADMIN' ? 'Manage templates, events, batches, and revocations' :
                   m.role === 'OPERATOR' ? 'Create batches, retry deliveries, and monitor pipelines' :
                   'Read-only access to certificates and batch reports'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Grant access to manage certificate pipelines.</p>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Member Email</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ADMIN">ADMIN (Can manage events, templates, batches)</option>
                  <option value="OPERATOR">OPERATOR (Can issue batches and retry emails)</option>
                  <option value="VIEWER">VIEWER (Read-only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
