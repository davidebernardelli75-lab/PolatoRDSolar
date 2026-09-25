import { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Package, Euro, CalendarDays, StickyNote, User, Building2, type LucideIcon } from 'lucide-react';
import type { Insurance, InsuranceInsert } from '@/lib/types';
import { INSURANCE_CATEGORIES, INSURANCE_COMPANIES } from '@/lib/insurance-presets';

const CUSTOM_CATEGORIES_KEY = 'polato_custom_insurance_categories';

function loadCustomCategories(): string[] {
  try {
    const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCustomCategory(value: string) {
  if (!value.trim()) return;
  const existing = loadCustomCategories();
  if (!existing.includes(value)) {
    existing.push(value);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(existing));
  }
}

export function InsuranceFormFields({
  form, update,
}: {
  form: InsuranceInsert;
  update: <K extends keyof InsuranceInsert>(key: K, value: InsuranceInsert[K]) => void;
}) {
  const [customProvider, setCustomProvider] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100';
  const selectClass = `${inputClass} uppercase`;

  useEffect(() => { setCustomCategories(loadCustomCategories()); }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <ShieldCheck size={14} className="text-blue-900" /> Polizza
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(['Privata', 'Aziendale'] as const).map((t) => {
            const Icon = t === 'Privata' ? User : Building2;
            return (
              <button key={t} type="button" onClick={() => update('insurance_type', t)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  form.insurance_type === t ? 'border-blue-900 bg-blue-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                }`}>
                <Icon size={15} /> {t}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoria" icon={ShieldCheck}>
            {customCategory ? (
              <div className="flex gap-1">
                <input autoFocus value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="Inserisci categoria" className={inputClass} />
                <button type="button" onClick={() => { setCustomCategory(false); update('category', ''); }} className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <select value={form.category} onChange={(e) => {
                const val = e.target.value;
                if (val === '__custom') { setCustomCategory(true); update('category', ''); }
                else update('category', val);
              }} className={inputClass}>
                <option value="">Categoria</option>
                {INSURANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                {customCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__custom">Altro...</option>
              </select>
            )}
          </Field>
          <Field label="Compagnia" icon={ShieldCheck}>
            {customProvider ? (
              <div className="flex gap-1">
                <input autoFocus value={form.provider} onChange={(e) => update('provider', e.target.value.toUpperCase())} placeholder="Inserisci compagnia" className={selectClass} />
                <button type="button" onClick={() => { setCustomProvider(false); update('provider', ''); }} className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <select value={form.provider} onChange={(e) => { const val = e.target.value; if (val === '__custom') { setCustomProvider(true); update('provider', ''); } else update('provider', val); }} className={selectClass}>
                <option value="">Compagnia</option>
                {INSURANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__custom">Altro...</option>
              </select>
            )}
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <FileText size={14} className="text-blue-900" /> Dettagli
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Numero polizza" icon={FileText}>
            <input value={form.policy_number ?? ''} onChange={(e) => update('policy_number', e.target.value)} placeholder="N. polizza" className={inputClass} />
          </Field>
          <Field label="Bene assicurato" icon={Package}>
            <input value={form.insured_item ?? ''} onChange={(e) => update('insured_item', e.target.value)} placeholder="Descrizione bene" className={inputClass} />
          </Field>
          <Field label="Premio annuo (€)" icon={Euro}>
            <input type="number" step="0.01" min="0" value={form.premium_amount ?? ''} onChange={(e) => update('premium_amount', e.target.value === '' ? null : parseFloat(e.target.value))} placeholder="0.00" className={inputClass} />
          </Field>
          <Field label="Inizio copertura" icon={CalendarDays}>
            <input type="date" value={form.start_date ?? ''} onChange={(e) => update('start_date', e.target.value || null)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Scadenza copertura" icon={CalendarDays}>
            <input type="date" value={form.expiry_date ?? ''} onChange={(e) => update('expiry_date', e.target.value || null)} className={inputClass} />
          </Field>
        </div>
      </section>

      <Field label="Note" icon={StickyNote}>
        <textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Aggiungi una nota..." className={`${inputClass} resize-none`} />
      </Field>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Icon size={13} className="text-slate-400" /> {label}
      </span>
      {children}
    </label>
  );
}

export function InsuranceEditCard({
  insurance, onCancel, onSave,
}: {
  insurance: Insurance;
  onCancel: () => void;
  onSave: (input: Partial<InsuranceInsert>) => Promise<void>;
}) {
  const [form, setForm] = useState<InsuranceInsert>({
    category: insurance.category, provider: insurance.provider,
    insurance_type: insurance.insurance_type,
    policy_number: insurance.policy_number, insured_item: insurance.insured_item,
    premium_amount: insurance.premium_amount, start_date: insurance.start_date,
    expiry_date: insurance.expiry_date, notes: insurance.notes,
  });
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof InsuranceInsert>(key: K, value: InsuranceInsert[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (customCategory && form.category.trim()) saveCustomCategory(form.category.trim());
      await onSave({
        ...form,
        policy_number: form.policy_number || null,
        insured_item: form.insured_item || null,
        premium_amount: form.premium_amount,
        start_date: form.start_date || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      });
    } catch { /* skip */ } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-400 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">Modifica polizza</span>
        <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"><X size={18} /></button>
      </div>
      <InsuranceFormFields form={form} update={update} />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
        <button onClick={onCancel}
          className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors">Annulla</button>
      </div>
    </div>
  );
}

export function InsuranceFormModal({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (input: InsuranceInsert) => Promise<void>;
}) {
  const [form, setForm] = useState<InsuranceInsert>({
    category: '', provider: '', insurance_type: 'Privata', policy_number: '', insured_item: '',
    premium_amount: null, start_date: '', expiry_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof InsuranceInsert>(key: K, value: InsuranceInsert[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (customCategory && form.category.trim()) saveCustomCategory(form.category.trim());
      await onSave({
        ...form,
        policy_number: form.policy_number || null,
        insured_item: form.insured_item || null,
        premium_amount: form.premium_amount,
        start_date: form.start_date || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      });
    } catch { /* skip */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Nuova Polizza</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <InsuranceFormFields form={form} update={update} />
          <button onClick={handleSave} disabled={saving || !form.category || !form.provider}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            {saving ? 'Salvataggio...' : 'Salva Polizza'}
          </button>
        </div>
      </div>
    </div>
  );
}
