/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './components/AuthProvider';
import { useAuthStore } from './store/authStore';

// ─────────────────────────────────────────────
// Lazy-loaded routes — each page is a separate bundle chunk
// ─────────────────────────────────────────────
const LandingPage    = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard      = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Investigation  = lazy(() => import('./pages/Investigation').then(m => ({ default: m.Investigation })));
const Profile        = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const NotFound       = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// ─────────────────────────────────────────────
// Page title manager — updates <title> per route
// ─────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/':          'AI Debug Detective — Gamified Debugging',
  '/dashboard': 'Detective HQ — AI Debug Detective',
  '/profile':   'Detective Profile — AI Debug Detective',
};

function PageTitleUpdater() {
  const location = useLocation();
  useEffect(() => {
    const staticTitle = PAGE_TITLES[location.pathname];
    if (staticTitle) {
      document.title = staticTitle;
    } else if (location.pathname.startsWith('/case/')) {
      const caseId = location.pathname.split('/case/')[1]?.toUpperCase();
      document.title = `Case ${caseId} — AI Debug Detective`;
    } else {
      document.title = 'AI Debug Detective';
    }
  }, [location.pathname]);
  return null;
}

// ─────────────────────────────────────────────
// Shared loading screen
// ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-cyan-400 font-mono text-sm uppercase tracking-widest animate-pulse">
      Loading...
    </div>
  );
}

// ─────────────────────────────────────────────
// Protected route guard
// ─────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
}

// ─────────────────────────────────────────────
// Per-page error boundary fallback
// ─────────────────────────────────────────────
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-200">
      <div className="max-w-md bg-slate-900/40 border border-red-500/30 p-8 rounded-xl shadow-2xl">
        <h2 className="text-xl font-extrabold text-red-400 mb-4 uppercase tracking-tighter">Critical System Failure</h2>
        <p className="text-sm font-mono text-slate-400 mb-6 bg-black/40 p-3 rounded">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded font-bold uppercase tracking-widest hover:bg-red-500/30 transition-colors"
        >
          Reboot System
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Wrap each route in its own ErrorBoundary
// ─────────────────────────────────────────────
function RouteWithErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <PageTitleUpdater />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={
                  <RouteWithErrorBoundary><LandingPage /></RouteWithErrorBoundary>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <RouteWithErrorBoundary><Dashboard /></RouteWithErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/case/:caseId" element={
                  <ProtectedRoute>
                    <RouteWithErrorBoundary><Investigation /></RouteWithErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <RouteWithErrorBoundary><Profile /></RouteWithErrorBoundary>
                  </ProtectedRoute>
                } />
                {/* 404 catch-all */}
                <Route path="*" element={
                  <RouteWithErrorBoundary><NotFound /></RouteWithErrorBoundary>
                } />
              </Routes>
            </Suspense>
            <Toaster theme="dark" position="top-right" className="font-sans" toastOptions={{
              style: { background: '#0f172a', border: '1px solid #1e293b', color: '#f1f5f9' },
              classNames: {
                success: 'border-cyan-500/30 text-cyan-400',
                error: 'border-red-500/30 text-red-400',
                warning: 'border-yellow-500/30 text-yellow-400',
                info: 'border-purple-500/30 text-purple-400',
              }
            }}/>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
