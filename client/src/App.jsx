import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Investigations from './pages/Investigations';
import CaseDetail from './pages/CaseDetail';
import Customers from './pages/Customers';
import Refunds from './pages/Refunds';
import Sandbox from './pages/Sandbox';

function ProtectedLayout({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
        Authenticating RefundShield Command Center...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-full overflow-x-hidden">
      <Navbar />
      <div className="flex flex-1 max-w-full overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/cases" element={<ProtectedLayout><Cases /></ProtectedLayout>} />
          <Route path="/cases/:caseId" element={<ProtectedLayout><CaseDetail /></ProtectedLayout>} />
          
          <Route path="/investigations" element={<ProtectedLayout><Investigations /></ProtectedLayout>} />
          <Route path="/investigations/:caseId" element={<ProtectedLayout><CaseDetail /></ProtectedLayout>} />
          
          <Route path="/customers" element={<ProtectedLayout><Customers /></ProtectedLayout>} />
          <Route path="/refunds" element={<ProtectedLayout><Refunds /></ProtectedLayout>} />
          <Route path="/sandbox" element={<ProtectedLayout><Sandbox /></ProtectedLayout>} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
