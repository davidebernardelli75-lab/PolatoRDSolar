import { useState } from 'react';
import { X } from 'lucide-react';
import type { Insurance, InsuranceInsert } from '@/lib/types';
import { INSURANCE_CATEGORIES, INSURANCE_COMPANIES } from '@/lib/insurance-presets';

export function InsuranceFormFields({
  form, update,
}: {
  form: InsuranceInsert;
  update: <K extends keyof InsuranceInsert>(key: K, value: InsuranceInsert[K]) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="">— Seleziona —</option>
            {INSURANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Compagnia</label>
          <select value={form.provider} onChange={(e) => update('provider', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="">— Seleziona —</option>
            {INSURANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom">Altro...</option>
          </select>
        </div>
      </div>
      {form.provider === '__custom' && (
        <input value="" onChange={(e) => update('provider', e.target.value.toUpperCase())}
          placeholder="Inserisci compagnia"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400" />
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Numero Polizza</label>
          <input value={form.policy_number ?? ''} onChange={(e) => update('policy_number', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Bene Assicurato</label>
          <input value={form.insured_item ?? ''} onChange={(e) => update('insured_item', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Premio Annuo (€)</label>
          <input type="number" step="0.01" min="0" value={form.premium_amount ?? ''}
            onChange={(e) => update('premium_amount', e.target.value === '' ? null : parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Inizio Copertura</label>
          <input type="date" value={form.start_date ?? ''}
            onChange={(e) => update('start_date', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Scadenza Copertura</label>
        <input type="date" value={form.expiry_date ?? ''}
          onChange={(e) => update('expiry_date', e.target.value || null)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
        <textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} rows={2}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      </div>
    </>
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
    policy_number: insurance.policy_number, insured_item: insurance.insured_item,
    premium_amount: insurance.premium_amount, start_date: insurance.start_date,
    expiry_date: insurance.expiry_date, notes: insurance.notes,
  });
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof InsuranceInsert>(key: K, value: InsuranceInsert[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
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
    category: '', provider: '', policy_number: '', insured_item: '',
    premium_amount: null, start_date: '', expiry_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof InsuranceInsert>(key: K, value: InsuranceInsert[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
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
