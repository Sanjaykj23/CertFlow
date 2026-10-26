import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Logo, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const { token, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen animate-fade-in flex-col items-center justify-center gap-5">
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
    <div className="min-h-screen">
      <Navbar />
      <main className={`mx-auto px-4 py-7 sm:px-6 sm:py-10 ${wide ? 'max-w-none !py-6' : 'max-w-[1240px]'}`}>
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
