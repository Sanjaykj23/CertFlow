import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Building2, ChevronDown, LogOut, Plus, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Logo, Modal } from './ui';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/events', label: 'Events', end: false },
  { to: '/certificates', label: 'Certificates', end: false },
  { to: '/pipeline', label: 'Pipeline', end: false },
  { to: '/members', label: 'Team', end: false },
  { to: '/audit-logs', label: 'Audit', end: false },
];

export const Navbar: React.FC = () => {
  const { user, activeOrg, switchOrg, logout, refreshUser } = useAuth();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const orgRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setShowOrgMenu(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.post('/organizations', { name: newOrgName.trim() });
      await refreshUser();
      setNewOrgName('');
      setShowNewOrgModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create the organization. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const initial = user?.fullName?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 border-b border-paper-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="CertFlow home">
          <Logo />
        </Link>

        <span className="hidden h-5 w-px bg-paper-200 md:block" />

        {/* Organization switcher */}
        <div className="relative hidden md:block" ref={orgRef}>
          <button
            type="button"
            onClick={() => setShowOrgMenu((v) => !v)}
            className="flex h-8 items-center gap-2 rounded-md border border-paper-200 bg-paper-50 px-2.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-ink-300"
            aria-expanded={showOrgMenu}
          >
            <Building2 className="h-3.5 w-3.5 text-seal-600" />
            <span className="max-w-[160px] truncate">{activeOrg?.organizationName || 'Select organization'}</span>
            <ChevronDown className="h-3 w-3 text-ink-400" />
          </button>
          {showOrgMenu && (
            <div className="menu left-0 top-10">
              <p className="eyebrow px-2.5 pb-1.5 pt-1">Organizations</p>
              {user?.organizations?.map((org) => {
                const active = activeOrg?.organizationId === org.organizationId;
                return (
                  <button
                    key={org.organizationId}
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      switchOrg(org);
                      setShowOrgMenu(false);
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {active ? <Check className="h-3.5 w-3.5 shrink-0 text-seal-600" /> : <span className="w-3.5 shrink-0" />}
                      <span className={`truncate ${active ? 'font-semibold text-ink' : ''}`}>{org.organizationName}</span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{org.role}</span>
                  </button>
                );
              })}
              <div className="mt-1 border-t border-paper-100 pt-1">
                <button
                  type="button"
                  className="menu-item justify-start gap-2 font-semibold text-seal-700"
                  onClick={() => {
                    setShowOrgMenu(false);
                    setShowNewOrgModal(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New organization
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-500 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-seal-600" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0" ref={userRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex h-8 items-center gap-2 rounded-md pl-1 pr-2 transition-colors hover:bg-paper-100"
              aria-expanded={showUserMenu}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-display text-[11px] font-semibold text-white">
                {initial}
              </span>
              <span className="hidden text-[13px] font-semibold text-ink-700 sm:block">{user?.fullName}</span>
              <ChevronDown className="h-3 w-3 text-ink-400" />
            </button>
            {showUserMenu && (
              <div className="menu right-0 top-10">
                <div className="border-b border-paper-100 px-2.5 pb-2.5 pt-1.5">
                  <p className="text-[13px] font-semibold text-ink">{user?.fullName}</p>
                  <p className="truncate text-[12px] text-ink-400">{user?.email}</p>
                </div>
                <button type="button" className="menu-item mt-1 justify-start gap-2 text-bad-500" onClick={logout}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact navigation for narrow screens */}
      <nav className="flex gap-1 overflow-x-auto border-t border-paper-100 px-3 py-1.5 lg:hidden" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `shrink-0 rounded-md px-3 py-1.5 text-[13px] font-semibold ${
                isActive ? 'bg-seal-50 text-seal-700' : 'text-ink-500'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Modal
        open={showNewOrgModal}
        onClose={() => setShowNewOrgModal(false)}
        title="New organization"
        description="A separate workspace for a college, company or hackathon."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowNewOrgModal(false)}>
              Cancel
            </button>
            <button type="submit" form="new-org-form" className="btn-primary" disabled={creating}>
              {creating ? 'Creating' : 'Create workspace'}
            </button>
          </>
        }
      >
        <form id="new-org-form" onSubmit={handleCreateOrg} className="space-y-3">
          {error && <div className="alert-error">{error}</div>}
          <div>
            <label className="label" htmlFor="new-org-name">
              Organization name
            </label>
            <input
              id="new-org-name"
              className="input"
              required
              placeholder="Easwari ACM Student Chapter"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </header>
  );
};
