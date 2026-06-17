import React, { Suspense, lazy, useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from './components/ui.jsx';
import { supabase, isDemo } from './services/supabase.js';
import Launcher from './pages/Launcher.jsx';
import TipPage from './pages/TipPage.jsx';

const WorkerFlow         = lazy(() => import('./flows/worker/WorkerFlow.jsx'));
const WorkerOnboarding   = lazy(() => import('./flows/worker/onboarding/WorkerOnboarding.jsx'));
const EmployerFlow       = lazy(() => import('./flows/employer/EmployerFlow.jsx'));
const EmployerOnboarding = lazy(() => import('./flows/employer/onboarding/EmployerOnboarding.jsx'));
const AdminFlow          = lazy(() => import('./flows/admin/AdminFlow.jsx'));
const AdminOnboarding    = lazy(() => import('./flows/admin/onboarding/AdminOnboarding.jsx'));

export const SessionCtx = createContext({ session: null, isDemo: true });
export const useSession = () => useContext(SessionCtx);

function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(isDemo);

  useEffect(() => {
    if (isDemo) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) return <Loading />;

  return (
    <SessionCtx.Provider value={{ session, isDemo }}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Launcher />} />
          <Route path="/tip/:slug" element={<TipPage />} />
          <Route path="/worker/onboarding" element={<WorkerOnboarding />} />
          <Route path="/worker/*" element={<WorkerFlow />} />
          <Route path="/employer/onboarding" element={<EmployerOnboarding />} />
          <Route path="/employer/*" element={<EmployerFlow />} />
          <Route path="/admin/onboarding" element={<AdminOnboarding />} />
          <Route path="/admin/*" element={<AdminFlow />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SessionCtx.Provider>
  );
}
