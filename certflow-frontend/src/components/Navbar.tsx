import React, { useState } from 'react';
import { useAuth, OrgMembership } from '../context/AuthContext';
import { Building2, ChevronDown, LogOut, User as UserIcon, Plus } from 'lucide-react';
import api from '../api/client';

export const Navbar: React.FC = () => {
  const { user, activeOrg, switchOrg, logout, refreshUser } = useAuth();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setLoading(true);
    try {
      await api.post('/organizations', { name: newOrgName.trim() });
      await refreshUser();
      setNewOrgName('');
      setShowNewOrgModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
      {/* Organization Switcher Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowOrgMenu(!showOrgMenu)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-sm font-medium text-slate-700"
        >
          <Building2 className="w-4 h-4 text-brand-600" />
          <span>{activeOrg?.organizationName || 'Select Organization'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showOrgMenu && (
          <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40">
            <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Your Organizations
            </p>
            {user?.organizations?.map((org) => (
              <button
                key={org.organizationId}
                onClick={() => {
                  switchOrg(org);
                  setShowOrgMenu(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-slate-50 ${
                  activeOrg?.organizationId === org.organizationId ? 'font-semibold text-brand-600 bg-brand-50/50' : 'text-slate-700'
                }`}
              >
                <span className="truncate">{org.organizationName}</span>
                <span className="text-[10px] text-slate-400 uppercase">{org.role}</span>
              </button>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setShowOrgMenu(false);
                  setShowNewOrgModal(true);
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-brand-600 hover:bg-brand-50 flex items-center gap-2 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Organization</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User info & Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-semibold text-slate-800 leading-none">{user?.fullName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Create Org Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Organization</h3>
            <p className="text-xs text-slate-500 mb-4">Set up a new workspace for your college, company, or hackathon.</p>
            <form onSubmit={handleCreateOrg}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford ACM Chapter"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrgModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
