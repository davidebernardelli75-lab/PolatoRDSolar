import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchAppRole, type AppRole } from '@/lib/access';
import type { Plant } from '@/lib/types';
import { fetchPlants, deletePlant, fetchAllRoadmapProgress } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { PlantEditor } from '@/components/PlantEditor';
import { PlantDetail } from '@/components/PlantDetail';
import { Login } from '@/components/Login';
import { PasswordRecovery } from '@/components/PasswordRecovery';
import { VehicleDashboard } from '@/components/VehicleDashboard';
import { InsuranceDashboard } from '@/components/InsuranceDashboard';
import { TrainingDashboard } from '@/components/TrainingDashboard';

export type View =
  | { name: 'dashboard' }
  | { name: 'new-plant' }
  | { name: 'edit-plant'; plantId: string }
  | { name: 'plant'; plantId: string }
  | { name: 'vehicles' }
  | { name: 'insurances' }
  | { name: 'training' };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [access, setAccess] = useState<{ userId: string; role: AppRole } | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: 'dashboard' });
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
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      // TOKEN_REFRESHED and USER_UPDATED must not wipe a verified role:
      // the role-loading effect is keyed to user ID, not the token.
      if (event === 'SIGNED_OUT') setAccess(null);
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
        // Fail closed for administration: staff can still work in FV.
        if (active) {
          setAccess(null);
          setAccessError('Impossibile verificare i permessi amministrativi. Solo la sezione impianti è disponibile; riprova ad accedere.');
        }
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
      setView({ name: 'dashboard' });
      window.history.replaceState(null, '', window.location.pathname);
    }} />
  );
  if (!session) return <Login />;

  const isAdmin = access?.userId === session.user.id && access.role === 'admin';
  const restricted = (v: View) => v.name === 'vehicles' || v.name === 'insurances' || v.name === 'training';
  const currentView: View = !isAdmin && restricted(view) ? { name: 'dashboard' } : view;
  const navigate = (v: View) => {
    // Navigation is secondary. Supabase RLS is the real permission boundary.
    setView(!isAdmin && restricted(v) ? { name: 'dashboard' } : v);
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

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigate}
        currentView={currentView}
        isAdmin={isAdmin}
        onSignOut={() => supabase.auth.signOut()}
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

        <main className="flex-1 overflow-y-auto">
          {(error || accessError) && (
            <div role="alert" className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error && <p>{error}</p>}
              {accessError && <p>{accessError}</p>}
            </div>
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
          {isAdmin && currentView.name === 'vehicles' && (
            <VehicleDashboard />
          )}
          {isAdmin && currentView.name === 'insurances' && (
            <InsuranceDashboard />
          )}
          {isAdmin && currentView.name === 'training' && (
            <TrainingDashboard />
          )}
        </main>
      </div>
    </div>
  );
}
