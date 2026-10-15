import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { PublicVerify } from './pages/PublicVerify';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Verification Route */}
          <Route path="/verify/:token" element={<PublicVerify />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated Dashboard Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:eventId" element={<EventDetail />} />
            <Route path="events/:eventId/templates/builder" element={<TemplateBuilder />} />
            <Route path="events/:eventId/import-csv" element={<CsvImport />} />
            <Route path="batches/:batchId/progress" element={<BatchProgress />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="members" element={<Members />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
