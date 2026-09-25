import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import type { PlantInsert, OwnerType } from '@/lib/types';
import { createPlant, updatePlant, fetchPlant } from '@/lib/api';
import { emptyPlantForm, Field } from './plant-editor-helpers';

interface PlantEditorProps {
  plantId?: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
}

export function PlantEditor({ plantId, onSaved, onCancel }: PlantEditorProps) {
  const [form, setForm] = useState<PlantInsert>(emptyPlantForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!plantId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plantId) return;
    (async () => {
      try {
        const plant = await fetchPlant(plantId);
        if (plant) {
          setForm({
            owner_type: plant.owner_type, owner_name: plant.owner_name,
            fiscal_or_vat: plant.fiscal_or_vat ?? '', address: plant.address,
            city: plant.city ?? '', province: plant.province ?? '', region: plant.region ?? '',
            phone: plant.phone ?? '', email: plant.email ?? '', pod: plant.pod ?? '',
            censimp_code: plant.censimp_code ?? '', total_power_kw: plant.total_power_kw,
            panel_brand_model: plant.panel_brand_model ?? '', inverter_brand_model: plant.inverter_brand_model ?? '',
            inverter_brand: plant.inverter_brand ?? '', inverter_model: plant.inverter_model ?? '',
            inverter_code: plant.inverter_code ?? '', storage_power_kw: plant.storage_power_kw,
            storage_brand: plant.storage_brand ?? '', storage_model: plant.storage_model ?? '',
            storage_code: plant.storage_code ?? '', charger_brand: plant.charger_brand ?? '',
            charger_model: plant.charger_model ?? '', charger_code: plant.charger_code ?? '',
            installation_date: plant.installation_date ?? null, notes: plant.notes ?? '',
          });
        }
      } catch { setError('Impossibile caricare i dati dell\'impianto.'); }
      finally { setLoading(false); }
    })();
  }, [plantId]);

  const update = <K extends keyof PlantInsert>(key: K, value: PlantInsert[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.owner_name.trim() || !form.address.trim()) { setError('Nome proprietario e indirizzo sono obbligatori.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = { ...form, owner_name: form.owner_name.trim(), address: form.address.trim() };
      if (plantId) { const updated = await updatePlant(plantId, payload); onSaved(updated.id); }
      else { const created = await createPlant(payload); onSaved(created.id); }
    } catch { setError("Impossibile salvare l'impianto. Riprova."); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors">
        <ArrowLeft size={18} /> Annulla
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{plantId ? 'Modifica Impianto' : 'Nuovo Impianto'}</h1>
      <p className="text-slate-500 text-sm mb-6">Inserisci i dati del proprietario e i dettagli tecnici dell{"'"}impianto.</p>
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Dati Proprietario</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo Proprietario</label>
              <div className="flex gap-2">
                {(['Privato', 'Azienda'] as OwnerType[]).map((type) => (
                  <button key={type} type="button" onClick={() => update('owner_type', type)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      form.owner_type === type ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>{type}</button>
                ))}
              </div>
            </div>
            <Field label={form.owner_type === 'Azienda' ? 'Ragione Sociale' : 'Nome Proprietario'} value={form.owner_name} onChange={(v) => update('owner_name', v)} required />
            <Field label="Codice Fiscale / P.IVA" value={form.fiscal_or_vat ?? ''} onChange={(v) => update('fiscal_or_vat', v)} />
            <Field label="Indirizzo" value={form.address} onChange={(v) => update('address', v)} required />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Città / Paese" value={form.city ?? ''} onChange={(v) => update('city', v)} />
              <Field label="Provincia" value={form.province ?? ''} onChange={(v) => update('province', v)} />
              <Field label="Regione" value={form.region ?? ''} onChange={(v) => update('region', v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telefono" value={form.phone ?? ''} onChange={(v) => update('phone', v)} />
              <Field label="Email" value={form.email ?? ''} onChange={(v) => update('email', v)} type="email" />
            </div>
          </div>
        </section>
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Dati Tecnici Impianto</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="POD" value={form.pod ?? ''} onChange={(v) => update('pod', v)} upper />
              <Field label="Codice CENSIMP" value={form.censimp_code ?? ''} onChange={(v) => update('censimp_code', v)} upper />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Potenza Totale (kW)</label>
                <input type="number" step="0.01" min="0" value={form.total_power_kw ?? ''}
                  onChange={(e) => update('total_power_kw', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data Installazione</label>
                <input type="date" value={form.installation_date ?? ''}
                  onChange={(e) => update('installation_date', e.target.value || null)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
              </div>
            </div>
            <Field label="Marca/Modello Pannelli" value={form.panel_brand_model ?? ''} onChange={(v) => update('panel_brand_model', v)} upper />
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Colonnine di ricarica</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Marca" value={form.charger_brand ?? ''} onChange={(v) => update('charger_brand', v)} upper />
                <Field label="Modello" value={form.charger_model ?? ''} onChange={(v) => update('charger_model', v)} upper />
                <Field label="Codice" value={form.charger_code ?? ''} onChange={(v) => update('charger_code', v)} upper />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Note</label>
              <textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} rows={3}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none" />
            </div>
          </div>
        </section>
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm">
            <Save size={18} /> {saving ? 'Salvataggio...' : plantId ? 'Salva Modifiche' : 'Salva Impianto'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">Annulla</button>
        </div>
      </form>
    </div>
  );
}
