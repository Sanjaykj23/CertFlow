import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChevronsUpDown, ChevronDown, LogOut, Plus, Check, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Logo, Modal } from './ui';
import { isDemo } from '../lib/env';
import { resetDemoData } from '../demo';

const ALL_NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/events', label: 'Events', end: false },
  { to: '/certificates', label: 'Certificates', end: false },
  { to: '/pipeline', label: 'Pipeline', end: false },
  { to: '/members', label: 'Team', end: false },
  { to: '/audit-logs', label: 'Audit', end: false },
];

// The Pipeline view needs the distributed (Kafka) backend, so it is demo-only.
const NAV_ITEMS = isDemo ? ALL_NAV_ITEMS : ALL_NAV_ITEMS.filter((i) => i.to !== '/pipeline');

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
  const orgInitial = activeOrg?.organizationName?.charAt(0).toUpperCase() || 'O';

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow,border-color] duration-200 ${
        scrolled
          ? 'border-paper-200 bg-white/80 shadow-[0_1px_0_rgba(15,26,43,0.03),0_8px_24px_-12px_rgba(15,26,43,0.18)]'
          : 'border-paper-200/70 bg-white/65'
      }`}
    >
      <div className="mx-auto flex h-[60px] max-w-[1240px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="shrink-0 rounded-md" aria-label="CertFlow home">
          <Logo />
        </Link>

        <span className="hidden h-6 w-px rotate-12 bg-paper-300 md:block" aria-hidden="true" />

        {/* Organization switcher */}
        <div className="relative hidden md:block" ref={orgRef}>
          <button
            type="button"
            onClick={() => setShowOrgMenu((v) => !v)}
            className={`flex h-9 items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-paper-100 ${
              showOrgMenu ? 'bg-paper-100' : ''
            }`}
            aria-expanded={showOrgMenu}
            aria-haspopup="menu"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-seal-500 to-seal-700 font-display text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
              {orgInitial}
            </span>
            <span className="max-w-[180px] truncate">{activeOrg?.organizationName || 'Select organization'}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-ink-400" />
          </button>
          {showOrgMenu && (
            <div className="menu left-0 top-11 w-72" role="menu">
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
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-display text-[11px] font-bold ${
                          active ? 'bg-gradient-to-br from-seal-500 to-seal-700 text-white' : 'bg-paper-200 text-ink-600'
                        }`}
                      >
                        {org.organizationName.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className={`block truncate ${active ? 'font-semibold text-ink' : ''}`}>{org.organizationName}</span>
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-400">{org.role}</span>
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-seal-600" />}
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

        <nav className="ml-1 hidden flex-1 items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
                  isActive ? 'bg-ink/[0.05] text-ink' : 'text-ink-500 hover:bg-ink/[0.035] hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-gradient-to-r from-seal-500 to-seal-600 shadow-[0_0_8px_rgba(18,135,127,0.55)]"
                      aria-hidden="true"
                    />
                  )}
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
              className={`flex h-9 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-paper-100 ${
                showUserMenu ? 'bg-paper-100' : ''
              }`}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
              aria-label="Account menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ink-700 to-ink font-display text-[12px] font-semibold text-white ring-2 ring-white shadow-[0_0_0_3px_rgba(18,135,127,0.25)]">
                {initial}
              </span>
              <span className="hidden text-[13px] font-semibold text-ink-700 sm:block">{user?.fullName}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-ink-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
            {showUserMenu && (
              <div className="menu right-0 top-11 w-64" role="menu">
                <div className="flex items-center gap-3 border-b border-paper-100 px-2.5 pb-3 pt-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-700 to-ink font-display text-[14px] font-semibold text-white">
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{user?.fullName}</p>
                    <p className="truncate text-[12px] text-ink-400">{user?.email}</p>
                  </div>
                </div>
                {activeOrg && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-[12px] text-ink-500 md:hidden">
                    <span className="truncate">{activeOrg.organizationName}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{activeOrg.role}</span>
                  </div>
                )}
                {isDemo && (
                  <button
                    type="button"
                    className="menu-item mt-1 justify-start gap-2"
                    onClick={() => {
                      resetDemoData();
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-ink-400" />
                    Reset sample data
                  </button>
                )}
                <button type="button" className="menu-item mt-1 justify-start gap-2 text-bad-500 hover:!bg-bad-50 hover:!text-bad-700" onClick={logout}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact navigation for narrow screens */}
      <nav className="flex gap-1 overflow-x-auto border-t border-paper-200/60 px-3 py-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                isActive ? 'bg-ink text-white shadow-raise' : 'text-ink-500 hover:bg-paper-100 hover:text-ink'
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
