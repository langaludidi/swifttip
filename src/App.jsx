import React, { Suspense, lazy, useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from './components/ui.jsx';
import { supabase, isDemo } from './services/supabase.js';
import Launcher from './pages/Launcher.jsx';
import TipPage from './pages/TipPage.jsx';

const WorkerFlow         = lazy(() => import('./flows/worker/WorkerFlow.jsx'));
const WorkerOnboarding   = lazy(() => import('./flows/worker/onboarding/WorkerOnboarding.jsx'));
const WorkerLogin        = lazy(() => import('./flows/worker/onboarding/WorkerLogin.jsx'));
const EmployerFlow       = lazy(() => import('./flows/employer/EmployerFlow.jsx'));
const EmployerOnboarding = lazy(() => import('./flows/employer/onboarding/EmployerOnboarding.jsx'));
const AdminFlow          = lazy(() => import('./flows/admin/AdminFlow.jsx'));
const AdminOnboarding    = lazy(() => import('./flows/admin/onboarding/AdminOnboarding.jsx'));

export const SessionCtx = createContext({ session: null, isDemo: true, role: null, roleReady: true });
export const useSession = () => useContext(SessionCtx);

function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );
}

// Route-level gate — RLS already enforces the real security boundary; this
// just stops /admin and /employer from rendering for visitors who can't use
// them, instead of silently showing an empty/broken screen.
function RequireRole({ role, children }) {
  const { session, role: userRole, roleReady, isDemo: demo } = useSession();
  if (demo) return children;
  if (!roleReady) return <Loading />;
  if (!session || userRole !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(isDemo);
  const [role, setRole] = useState(null);
  const [roleReady, setRoleReady] = useState(isDemo);

  useEffect(() => {
    if (isDemo) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isDemo) return;
    if (!session?.user?.id) { setRole(null); setRoleReady(true); return; }
    setRoleReady(false);
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => { setRole(data?.role ?? null); setRoleReady(true); });
  }, [session?.user?.id]);

  if (!authReady) return <Loading />;

  return (
    <SessionCtx.Provider value={{ session, isDemo, role, roleReady }}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Launcher />} />
          <Route path="/tip/:slug" element={<TipPage />} />
          <Route path="/worker/onboarding" element={<WorkerOnboarding />} />
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/worker/*" element={<WorkerFlow />} />
          <Route path="/employer/onboarding" element={<EmployerOnboarding />} />
          <Route path="/employer/*" element={<RequireRole role="employer"><EmployerFlow /></RequireRole>} />
          <Route path="/admin/onboarding" element={<AdminOnboarding />} />
          <Route path="/admin/*" element={<RequireRole role="admin"><AdminFlow /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SessionCtx.Provider>
  );
}
