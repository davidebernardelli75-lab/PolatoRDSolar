import { Sun, MapPin, Zap, Plus, Search, MoreVertical, Pencil, Trash2, AlertTriangle, X, ListChecks, Home, Factory } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Plant } from '@/lib/types';
import { getProgressColor } from '@/components/Roadmap';

interface DashboardProps {
  plants: Plant[];
  loading: boolean;
  roadmapProgress: Record<string, number>;
  onOpenPlant: (id: string) => void;
  onNewPlant: () => void;
  onEditPlant: (id: string) => void;
  onDeletePlant: (id: string) => Promise<void>;
  onClearPlantAlert: (id: string) => Promise<void>;
}

export function Dashboard({ plants, loading, roadmapProgress, onOpenPlant, onNewPlant, onEditPlant, onDeletePlant, onClearPlantAlert }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Plant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearingAlertId, setClearingAlertId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const filtered = plants.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.owner_name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.fiscal_or_vat ?? '').toLowerCase().includes(q)
    );
  });

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await onDeletePlant(confirmDelete.id);
      setConfirmDelete(null);
    } catch {
      // error handled by parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header with logo and primary button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <img
            src="/assets/images/Polato_R&D.png"
            alt="Polato R&D"
            className="h-12 w-12 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Impianti Solari</h1>
            <p className="text-slate-500 text-sm mt-1">
              {plants.length} impiant{plants.length === 1 ? 'o' : 'i'} archiviat{plants.length === 1 ? 'o' : 'i'}
            </p>
          </div>
        </div>
        <button
          onClick={onNewPlant}
          className="hidden sm:flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nuovo Impianto
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Cerca per nome, indirizzo o codice fiscale..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-5">
            <Sun className="text-blue-900" size={36} />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {search ? 'Nessun risultato' : 'Nessun impianto archiviato'}
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-sm">
            {search ? 'Prova a modificare la ricerca.' : 'Crea il primo impianto solare per iniziare l\'archiviazione.'}
          </p>
          {!search && (
            <button
              onClick={onNewPlant}
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={20} />
              Nuovo Impianto
            </button>
          )}
        </div>
      ) : (
        /* Plant list */
        <div className="space-y-3">
          {filtered.map((plant) => {
            const hasAlert = Boolean(plant.notes?.trim());
            const progress = roadmapProgress[plant.id] ?? 0;
            const progressColor = getProgressColor(progress);

            return (
              <div
                key={plant.id}
                className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-red-400 hover:shadow-lg sm:p-5"
              >
                <div className={`grid gap-4 ${hasAlert ? 'sm:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)] sm:items-center' : 'sm:grid-cols-1'}`}>
                  <button
                    onClick={() => onOpenPlant(plant.id)}
                    className="w-full pr-8 text-left"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-900 transition-colors group-hover:bg-red-500">
                        {plant.owner_type === 'Azienda'
                          ? <Factory className="text-red-400 transition-colors group-hover:text-white" size={21} />
                          : <Home className="text-red-400 transition-colors group-hover:text-white" size={21} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                          {plant.owner_name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{plant.address}</span>
                          </span>
                          {plant.total_power_kw != null && (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Zap size={12} />
                              {plant.total_power_kw} kWh
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:ml-auto">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          plant.owner_type === 'Azienda'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {plant.owner_type}
                        </span>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <ListChecks size={14} className="text-slate-400" />
                            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">SyncroSolar</span>
                          </div>
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressColor.bar}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className={`min-w-[38px] text-right text-sm font-bold tabular-nums ${progressColor.text}`}>
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {hasAlert && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 sm:mr-7">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Alert operativo</p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-xs font-medium text-slate-800">{plant.notes}</p>
                        </div>
                        <button
                          type="button"
                          disabled={clearingAlertId === plant.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setClearingAlertId(plant.id);
                            try { await onClearPlantAlert(plant.id); }
                            finally { setClearingAlertId(null); }
                          }}
                          className="shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                          aria-label={`Segna come svolto l'alert di ${plant.owner_name}`}
                        >
                          {clearingAlertId === plant.id ? '...' : 'Svolto'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute right-3 top-3" ref={openMenuId === plant.id ? menuRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === plant.id ? null : plant.id);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 touch-manipulation"
                    aria-label="Apri menu gestione"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {openMenuId === plant.id && (
                    <div className="absolute right-0 top-full mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          onEditPlant(plant.id);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 touch-manipulation"
                      >
                        <Pencil size={16} className="text-blue-900" />
                        Modifica Dati
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setConfirmDelete(plant);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 touch-manipulation"
                      >
                        <Trash2 size={16} />
                        Elimina Impianto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating action button for mobile */}
      <button
        onClick={onNewPlant}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label="Nuovo Impianto"
      >
        <Plus size={24} />
      </button>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Elimina Impianto</h3>
                <p className="text-sm text-slate-500">
                  Sei sicuro? Azione irreversibile.
                </p>
                <p className="text-sm text-slate-700 font-medium mt-2">
                  {confirmDelete.owner_name}
                </p>
                <p className="text-xs text-slate-400">
                  {confirmDelete.address}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                <X size={16} />
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
