import { Sun, MapPin, Zap, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { Plant } from '@/lib/types';

interface DashboardProps {
  plants: Plant[];
  loading: boolean;
  onOpenPlant: (id: string) => void;
  onNewPlant: () => void;
}

export function Dashboard({ plants, loading, onOpenPlant, onNewPlant }: DashboardProps) {
  const [search, setSearch] = useState('');

  const filtered = plants.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.owner_name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.fiscal_or_vat ?? '').toLowerCase().includes(q)
    );
  });

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        /* Plant grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plant) => (
            <button
              key={plant.id}
              onClick={() => onOpenPlant(plant.id)}
              className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-red-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-900 rounded-lg group-hover:bg-red-500 transition-colors">
                  <Sun className="text-red-400 group-hover:text-white transition-colors" size={20} />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                  plant.owner_type === 'Azienda'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {plant.owner_type}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-1">
                {plant.owner_name}
              </h3>
              <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
                <MapPin size={12} />
                <span className="line-clamp-1">{plant.address}</span>
              </div>
              {plant.total_power_kw != null && (
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <Zap size={12} />
                  <span>{plant.total_power_kw} kW</span>
                </div>
              )}
            </button>
          ))}
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
    </div>
  );
}
