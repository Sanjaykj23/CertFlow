import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Events } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { CsvImport } from './pages/CsvImport';
import { BatchProgress } from './pages/BatchProgress';
import { Certificates } from './pages/Certificates';
import { Members } from './pages/Members';
import { AuditLogs } from './pages/AuditLogs';
import { Pipeline } from './pages/Pipeline';
import { PublicVerify } from './pages/PublicVerify';
import { isDemo } from './lib/env';

// Demo builds are often served from a sub-path or an embedded frame, so they
// use hash routing and need no server-side rewrite rules.
const Router: React.ComponentType<{ children: React.ReactNode }> = isDemo ? HashRouter : BrowserRouter;

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public verification route */}
          <Route path="/verify/:token" element={<PublicVerify />} />

          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:eventId" element={<EventDetail />} />
            <Route path="events/:eventId/templates/builder" element={<TemplateBuilder />} />
            <Route path="events/:eventId/import-csv" element={<CsvImport />} />
            <Route path="batches/:batchId/progress" element={<BatchProgress />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="members" element={<Members />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
