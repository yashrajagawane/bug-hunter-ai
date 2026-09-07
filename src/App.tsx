/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './components/AuthProvider';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Investigation } from './pages/Investigation';
import { Profile } from './pages/Profile';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020617] text-cyan-400 font-mono text-sm tracking-widest uppercase animate-pulse">Initializing System...</div>;
  
  if (!user) return <Navigate to="/" />;
  
  return <>{children}</>;
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-200">
      <div className="max-w-md bg-slate-900/40 border border-red-500/30 p-8 rounded-xl shadow-2xl">
        <h2 className="text-xl font-extrabold text-red-400 mb-4 uppercase tracking-tighter">Critical System Failure</h2>
        <p className="text-sm font-mono text-slate-400 mb-6 bg-black/40 p-3 rounded">{error.message}</p>
        <button onClick={resetErrorBoundary} className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded font-bold uppercase tracking-widest hover:bg-red-500/30 transition-colors">
          Reboot System
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/case/:caseId" element={<ProtectedRoute><Investigation /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster theme="dark" position="top-right" className="font-sans" toastOptions={{
            style: { background: '#0f172a', border: '1px solid #1e293b', color: '#f1f5f9' },
            classNames: {
              success: 'border-cyan-500/30 text-cyan-400',
              error: 'border-red-500/30 text-red-400',
              warning: 'border-yellow-500/30 text-yellow-400',
              info: 'border-purple-500/30 text-purple-400',
            }
          }}/>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
