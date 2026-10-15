import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Award,
  FileCheck,
  ShieldCheck,
  Users,
  Settings,
  ScrollText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { activeOrg } = useAuth();

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/events', label: 'Events & Batches', icon: Calendar },
    { to: '/certificates', label: 'Certificates', icon: Award },
    { to: '/members', label: 'Organization Team', icon: Users },
    { to: '/audit-logs', label: 'Audit Trail', icon: ScrollText },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/20">
          CF
        </div>
        <div>
          <span className="font-bold text-white text-lg tracking-tight">CertFlow</span>
          <span className="text-[10px] ml-1.5 font-semibold text-brand-400 uppercase tracking-wider bg-brand-950/80 px-1.5 py-0.5 rounded border border-brand-800/50">
            SaaS
          </span>
        </div>
      </div>

      {/* Active Organization Info */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Current Workspace</p>
        <p className="text-sm font-semibold text-white truncate mt-0.5">
          {activeOrg?.organizationName || 'Personal Workspace'}
        </p>
        <span className="inline-block mt-1 text-[11px] font-medium text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
          Role: {activeOrg?.role || 'OWNER'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Distributed Architecture Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Cluster Status</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            CockroachDB • Kafka • MinIO
          </div>
        </div>
      </div>
    </aside>
  );
};
