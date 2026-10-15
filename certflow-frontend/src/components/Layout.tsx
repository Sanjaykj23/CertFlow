import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { Navbar } from './Navbar';
import { Logo, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { isDemo } from '../lib/env';
import { resetDemoData } from '../demo';

export const Layout: React.FC = () => {
  const { token, loading } = useAuth();
  const { pathname } = useLocation();
  const [confirmReset, setConfirmReset] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 bg-paper">
        <Logo size={36} />
        <Spinner label="Loading workspace" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // The template designer needs room for the canvas and property panel.
  const wide = pathname.includes('/templates/builder');

  return (
    <div className="min-h-screen bg-paper">
      {isDemo && (
        <div className="border-b border-foil-500/30 bg-foil-50">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-1.5 text-[12px] text-foil-600 sm:px-6">
            <span className="flex items-center gap-2 font-medium">
              <FlaskConical className="h-3.5 w-3.5 shrink-0" />
              Demo mode. Everything runs in this browser; no email is sent and nothing leaves your device.
            </span>
            {confirmReset ? (
              <span className="flex shrink-0 items-center gap-2">
                <span className="hidden sm:inline">Erase all demo data?</span>
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={() => {
                    resetDemoData();
                  }}
                >
                  Yes, reset
                </button>
                <button type="button" className="underline underline-offset-2" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="flex shrink-0 items-center gap-1.5 font-semibold underline-offset-2 hover:underline"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw className="h-3 w-3" />
                Reset demo
              </button>
            )}
          </div>
        </div>
      )}
      <Navbar />
      <main className={`mx-auto px-4 py-8 sm:px-6 ${wide ? 'max-w-none' : 'max-w-[1240px]'}`}>
        <Outlet />
      </main>
    </div>
  );
};
