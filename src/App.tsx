import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Plant } from '@/lib/types';
import { fetchPlants, deletePlant } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { PlantEditor } from '@/components/PlantEditor';
import { PlantDetail } from '@/components/PlantDetail';

export type View =
  | { name: 'dashboard' }
  | { name: 'new-plant' }
  | { name: 'edit-plant'; plantId: string }
  | { name: 'plant'; plantId: string };

export default function App() {
  const [view, setView] = useState<View>({ name: 'dashboard' });
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadPlants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlants();
      setPlants(data);
    } catch {
      setError('Impossibile caricare gli impianti. Riprova.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  const navigate = (v: View) => {
    setView(v);
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
        currentView={view}
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
          {error && (
            <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {view.name === 'dashboard' && (
            <Dashboard
              plants={plants}
              loading={loading}
              onOpenPlant={(id) => navigate({ name: 'plant', plantId: id })}
              onNewPlant={() => navigate({ name: 'new-plant' })}
              onEditPlant={(id) => navigate({ name: 'edit-plant', plantId: id })}
              onDeletePlant={handleDeletePlant}
            />
          )}
          {view.name === 'new-plant' && (
            <PlantEditor
              onSaved={(id) => {
                loadPlants();
                navigate({ name: 'plant', plantId: id });
              }}
              onCancel={() => navigate({ name: 'dashboard' })}
            />
          )}
          {view.name === 'edit-plant' && (
            <PlantEditor
              plantId={view.plantId}
              onSaved={(id) => {
                loadPlants();
                navigate({ name: 'plant', plantId: id });
              }}
              onCancel={() => navigate({ name: 'dashboard' })}
            />
          )}
          {view.name === 'plant' && (
            <PlantDetail
              plantId={view.plantId}
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
        </main>
      </div>

      <div id="barcode-reader-image-only" className="hidden" />
    </div>
  );
}
