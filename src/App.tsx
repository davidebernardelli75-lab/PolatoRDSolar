import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearLocalSupabaseAuth, supabase } from '@/lib/supabase';

function isPasswordRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return query.get('auth') === 'recovery' || hash.get('type') === 'recovery';
}
import { fetchAppRole, type AppRole } from '@/lib/access';
import type { Plant } from '@/lib/types';
import { fetchPlants, deletePlant, fetchAllRoadmapProgress, updatePlant } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { PlantEditor } from '@/components/PlantEditor';
import { PlantDetail } from '@/components/PlantDetail';
import { Login } from '@/components/Login';
import { PasswordRecovery } from '@/components/PasswordRecovery';
import { VehicleDashboard } from '@/components/VehicleDashboard';
import { InsuranceDashboard } from '@/components/InsuranceDashboard';
import { TrainingDashboard } from '@/components/TrainingDashboard';
import { QuoteDashboard } from '@/components/QuoteDashboard';
import { WorkReportDashboard } from '@/components/WorkReportDashboard';
import { CalendarDashboard } from '@/components/CalendarDashboard';
import { ModuleLauncher } from '@/components/ModuleLauncher';

export type View =
  | { name: 'launcher' }
  | { name: 'dashboard' }
  | { name: 'new-plant' }
  | { name: 'edit-plant'; plantId: string }
  | { name: 'plant'; plantId: string }
  | { name: 'reports' }
  | { name: 'vehicles' }
  | { name: 'insurances' }
  | { name: 'training' }
  | { name: 'quotes' }
  | { name: 'calendar' };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(() => isPasswordRecoveryUrl());
  const [area, setArea] = useState<'home' | 'admin' | 'fv'>('home');
  const [access, setAccess] = useState<{ userId: string; role: AppRole } | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: 'launcher' });
  const [plants, setPlants] = useState<Plant[]>([]);
  const [roadmapProgress, setRoadmapProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadPlants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, progress] = await Promise.all([fetchPlants(), fetchAllRoadmapProgress()]);
      setPlants(data);
      setRoadmapProgress(progress);
    } catch {
      setError('Impossibile caricare gli impianti. Riprova.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAccess(null);
      setSession(data.session);
      if (isPasswordRecoveryUrl()) setPasswordRecovery(true);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      // TOKEN_REFRESHED and USER_UPDATED must not wipe a verified role:
      // the role-loading effect is keyed to user ID, not the token.
      if (event === 'SIGNED_OUT') { setAccess(null); setArea('home'); }
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user.id) {
      setAccess(null);
      setAccessError(null);
      return;
    }
    setAccess(null);
    setAccessError(null);
    const userId = session.user.id;
    void fetchAppRole(userId)
      .then((role) => {
        if (active) setAccess({ userId, role });
      })
      .catch(() => {
        if (!active) return;
        setAccess(null);
        setAccessError('Impossibile verificare i permessi. Riprova ad accedere.');
      });
    return () => { active = false; };
  }, [session?.user.id]);

  useEffect(() => {
    if (session) loadPlants();
    else { setPlants([]); setLoading(false); }
  }, [loadPlants, session]);

  if (authLoading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm text-slate-600">Verifica accesso…</div>;
  // Supabase emits PASSWORD_RECOVERY after validating the emailed link.
  // Never treat its temporary session as a normal dashboard sign-in.
  if (passwordRecovery) return (
    <PasswordRecovery onComplete={() => {
      setPasswordRecovery(false);
      setAccess(null);
      setSession(null);
      setArea('home');
      setView({ name: 'launcher' });
      setPlants([]);
      setRoadmapProgress({});
      window.history.replaceState(null, '', window.location.pathname);
    }} />
  );
  if (!session) return <Login onSignedIn={(selected) => { setArea(selected); setView({ name: 'launcher' }); }} />;
  if (!access) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-5 text-center">
      <p className="text-sm text-slate-700">{accessError ?? 'Verifica dei permessi in corso…'}</p>
      {accessError && <button className="rounded-lg bg-blue-900 px-5 py-2 text-white" onClick={() => { void supabase.auth.signOut(); }}>Esci e riprova</button>}
    </main>
  );
  if (area === 'home') return <Login onSignedIn={(selected) => { setArea(selected); setView({ name: 'launcher' }); }} />;

  const isAdmin = access?.userId === session.user.id && access.role === 'admin';
  const adminArea = isAdmin && area === 'admin';
  const restricted = (v: View) => v.name === 'vehicles' || v.name === 'insurances' || v.name === 'training' || v.name === 'quotes' || v.name === 'calendar';
  const currentView: View = !adminArea && restricted(view) ? { name: 'dashboard' } : view;
  const navigate = (v: View) => {
    // Navigation is secondary. Supabase RLS is the real permission boundary.
    setView(!adminArea && restricted(v) ? { name: 'dashboard' } : v);
    setSidebarOpen(false);
  };

  const handleDeletePlant = async (id: string) => {
    try {
      await deletePlant(id);
      await loadPlants();
    } catch {
      setError('Impossibile eliminare l\'impianto. Riprova.');
    }
  };

  const handleClearPlantAlert = async (id: string) => {
    try {
      const updated = await updatePlant(id, { notes: null });
      setPlants((current) => current.map((plant) => plant.id === id ? updated : plant));
      setError(null);
    } catch {
      setError('Impossibile cancellare l\'alert dell\'impianto. Riprova.');
    }
  };

  const handleSignOut = async () => {
    setSidebarOpen(false);
    setError(null);

    let requiresHardReset = false;
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      requiresHardReset = Boolean(signOutError);
    } catch {
      requiresHardReset = true;
    }

    if (requiresHardReset) {
      try {
        clearLocalSupabaseAuth();
      } finally {
        window.location.replace(window.location.pathname);
      }
      return;
    }

    setAccess(null);
    setSession(null);
    setArea('home');
    setView({ name: 'launcher' });
    setPlants([]);
    setRoadmapProgress({});
  };

  const handleChangeArea = async () => {
    // Switching operational areas must also switch the authenticated identity.
    // Reuse the logout flow so the next area always requires its own password.
    await handleSignOut();
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigate}
        currentView={currentView}
        isAdmin={adminArea}
        onChangeArea={() => { void handleChangeArea(); }}
        onSignOut={() => { void handleSignOut(); }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 bg-blue-900 text-white px-4 py-3 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-blue-800 transition-colors"
            aria-label="Apri menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-sm tracking-wide">Polato R&D</span>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {(error || accessError) && (
            <div role="alert" className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error && <p>{error}</p>}
              {accessError && <p>{accessError}</p>}
            </div>
          )}
          {currentView.name === 'launcher' && (
            <ModuleLauncher isAdmin={adminArea} onNavigate={navigate} />
          )}
          {currentView.name === 'dashboard' && (
            <Dashboard
              plants={plants}
              loading={loading}
              roadmapProgress={roadmapProgress}
              onOpenPlant={(id) => navigate({ name: 'plant', plantId: id })}
              onNewPlant={() => navigate({ name: 'new-plant' })}
              onEditPlant={(id) => navigate({ name: 'edit-plant', plantId: id })}
              onDeletePlant={handleDeletePlant}
              onClearPlantAlert={handleClearPlantAlert}
            />
          )}
          {currentView.name === 'new-plant' && (
            <PlantEditor
              onSaved={(id) => {
                loadPlants();
                navigate({ name: 'plant', plantId: id });
              }}
              onCancel={() => navigate({ name: 'dashboard' })}
            />
          )}
          {currentView.name === 'edit-plant' && (
            <PlantEditor
              plantId={currentView.plantId}
              onSaved={(id) => {
                loadPlants();
                navigate({ name: 'plant', plantId: id });
              }}
              onCancel={() => navigate({ name: 'dashboard' })}
            />
          )}
          {currentView.name === 'plant' && (
            <PlantDetail
              plantId={currentView.plantId}
              onBack={() => {
                loadPlants();
                navigate({ name: 'dashboard' });
              }}
              onDeleted={() => {
                loadPlants();
                navigate({ name: 'dashboard' });
              }}
            />
          )}
          {currentView.name === 'reports' && (
            <WorkReportDashboard isAdmin={adminArea} />
          )}
          {adminArea && currentView.name === 'vehicles' && (
            <VehicleDashboard />
          )}
          {adminArea && currentView.name === 'insurances' && (
            <InsuranceDashboard />
          )}
          {adminArea && currentView.name === 'training' && (
            <TrainingDashboard />
          )}
          {adminArea && currentView.name === 'quotes' && (
            <QuoteDashboard />
          )}
          {adminArea && currentView.name === 'calendar' && (
            <CalendarDashboard />
          )}
        </main>
      </div>
    </div>
  );
}
