import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Trash2, FileText, Loader2, ChevronDown, AlertTriangle, User, Building2, FileDown } from 'lucide-react';
import type { Insurance, InsuranceInsert } from '@/lib/types';
import { fetchInsurances, createInsurance, updateInsurance, deleteInsurance } from '@/lib/api';
import { INSURANCE_CATEGORIES } from '@/lib/insurance-presets';
import { InsuranceEditCard, InsuranceFormModal } from './insurance-forms';
import { generateInsurancePdf } from '@/lib/pdf';
import { saveAs } from 'file-saver';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/D';
  return dateStr.slice(0, 10);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(dateStr: string | null): 'ok' | 'warning' | 'danger' | 'none' {
  const days = daysUntil(dateStr);
  if (days === null) return 'none';
  if (days < 0) return 'danger';
  if (days <= 30) return 'warning';
  return 'ok';
}

const statusConfig = {
  ok: { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  danger: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  none: { dot: 'bg-slate-300', text: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
};

export function InsuranceDashboard() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  const loadInsurances = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchInsurances(); setInsurances(data); }
    catch { /* skip */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInsurances(); }, [loadInsurances]);

  const filtered = filterCategory ? insurances.filter((i) => i.category === filterCategory) : insurances;
  const alertCount = insurances.filter((i) => {
    const s = getExpiryStatus(i.expiry_date);
    return s === 'warning' || s === 'danger';
  }).length;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24">
      <div className="bg-blue-900 text-white rounded-2xl p-5 lg:p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-300">ASSICURAZIONI</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold mb-1">Assicurazioni</h1>
            <div className="text-slate-400 text-sm">
              {insurances.length} polizze registrate
              {alertCount > 0 && <span className="text-amber-400 ml-2">- {alertCount} in scadenza</span>}
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500 rounded-xl">
              <ShieldCheck className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
          <option value="">Tutte le categorie</option>
          {INSURANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Aggiungi Polizza
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <ShieldCheck className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 text-sm">Nessuna polizza registrata.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ins) => (
            <InsuranceCard key={ins.id} insurance={ins} expanded={expandedId === ins.id}
              onToggle={() => setExpandedId(expandedId === ins.id ? null : ins.id)}
              onUpdate={async (input) => { await updateInsurance(ins.id, input); loadInsurances(); }}
              onDelete={async () => { await deleteInsurance(ins.id); loadInsurances(); }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <InsuranceFormModal onClose={() => setShowForm(false)}
          onSave={async (input) => { await createInsurance(input); loadInsurances(); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function InsuranceCard({
  insurance, expanded, onToggle, onUpdate, onDelete,
}: {
  insurance: Insurance;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (input: Partial<InsuranceInsert>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const status = getExpiryStatus(insurance.expiry_date);
  const cfg = statusConfig[status];
  const expDays = daysUntil(insurance.expiry_date);

  if (editing) {
    return (
      <InsuranceEditCard insurance={insurance} onCancel={() => setEditing(false)}
        onSave={async (input) => { await onUpdate(input); setEditing(false); }} />
    );
  }

  if (confirmDel) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-700">Eliminare questa polizza?</span>
        <div className="flex gap-2">
          <button onClick={async () => { await onDelete(); }}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Elimina</button>
          <button onClick={() => setConfirmDel(false)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">Annulla</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border ${cfg.border} p-4`}>
      <div className="flex items-center gap-3">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
          {insurance.insurance_type === 'Aziendale' ? <Building2 size={20} /> : <User size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{insurance.category}</span>
            {insurance.insurance_type && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                insurance.insurance_type === 'Aziendale'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {insurance.insurance_type}
              </span>
            )}
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0`} />
          </div>
          <div className="text-xs text-slate-500 truncate">
            {insurance.provider} {insurance.insured_item ? `· ${insurance.insured_item}` : ''}
          </div>
          {insurance.notes && (
            <div className="text-[11px] text-slate-400 truncate mt-0.5">{insurance.notes}</div>
          )}
        </div>
        {expDays !== null && expDays <= 30 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <AlertTriangle size={16} className={cfg.text} />
            <span className={`text-xs font-medium ${cfg.text}`}>{expDays < 0 ? 'Scaduta' : `${expDays}g`}</span>
          </div>
        )}
        <button onClick={onToggle}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
          <ChevronDown size={18} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400 text-xs mb-0.5">Tipo</div>
              <div className="text-slate-900 font-medium">{insurance.insurance_type || 'N/D'}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">Compagnia</div>
              <div className="text-slate-900 font-medium">{insurance.provider || 'N/D'}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">Numero Polizza</div>
              <div className="text-slate-900 font-medium">{insurance.policy_number || 'N/D'}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">Bene Assicurato</div>
              <div className="text-slate-900 font-medium">{insurance.insured_item || 'N/D'}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">Premio Annuo</div>
              <div className="text-slate-900 font-medium">{insurance.premium_amount != null ? `€ ${insurance.premium_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">Inizio Copertura</div>
              <div className="text-slate-900 font-medium">{formatDate(insurance.start_date)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">Scadenza</div>
              <div className="text-slate-900 font-medium">{formatDate(insurance.expiry_date)}</div>
            </div>
          </div>
          {insurance.notes && <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">{insurance.notes}</div>}
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors">
              <FileText size={16} /> Modifica
            </button>
            <button onClick={async () => {
              try {
                const blob = await generateInsurancePdf(insurance);
                saveAs(blob, `Assicurazione_${insurance.category}_${insurance.provider}.pdf`);
              } catch { /* skip */ }
            }}
              className="flex items-center justify-center gap-1.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium py-2 rounded-lg transition-colors">
              <FileDown size={16} /> PDF
            </button>
            <button onClick={() => setConfirmDel(true)}
              className="flex items-center justify-center gap-1.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium py-2 rounded-lg transition-colors">
              <Trash2 size={16} /> Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
