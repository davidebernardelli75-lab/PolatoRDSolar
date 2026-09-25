import { useState } from 'react';
import { FileText, ScanLine, Trash2, X } from 'lucide-react';
import { EquipmentScannerModal } from './EquipmentScannerModal';

export interface EquipmentField {
  label: string;
  value: string;
}

export function EquipmentRow({
  index,
  fields,
  extraField,
  onChange,
  onChangeExtra,
  onSave,
  onDelete,
  brandOptions,
  modelOptionsFor,
  onEnsureBrand,
  onEnsureModel,
}: {
  index: number;
  fields: EquipmentField[];
  extraField?: EquipmentField;
  onChange: (fieldIndex: number, value: string) => void;
  onChangeExtra?: (value: string) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  brandOptions?: readonly string[];
  modelOptionsFor?: (brand: string) => readonly string[];
  onEnsureBrand?: (brand: string) => Promise<void>;
  onEnsureModel?: (brand: string, model: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [customBrand, setCustomBrand] = useState(false);
  const [customModel, setCustomModel] = useState(false);

  const hasData = fields.some((f) => f.value) || (extraField && extraField.value);

  const handleSave = async () => {
    setSaving(true);
    try {
      const brandVal = fields.find((f) => f.label === 'Marca')?.value ?? '';
      const modelVal = fields.find((f) => f.label === 'Modello')?.value ?? '';
      if (onEnsureBrand && brandVal && brandVal !== '__custom') {
        await onEnsureBrand(brandVal);
      }
      if (onEnsureModel && brandVal && modelVal && brandVal !== '__custom' && modelVal !== '__custom') {
        await onEnsureModel(brandVal, modelVal);
      }
      await onSave();
      setCustomBrand(false);
      setCustomModel(false);
      setEditing(false);
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  };

  if (confirmDel) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-700">Eliminare questa voce?</span>
        <div className="flex gap-2">
          <button
            onClick={async () => { await onDelete(); setConfirmDel(false); }}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Elimina
          </button>
          <button
            onClick={() => setConfirmDel(false)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Voce {index + 1}</span>
          <button
            onClick={() => setEditing(false)}
            className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`grid grid-cols-1 ${extraField ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
          {fields.map((f, i) => {
            const isBrand = f.label === 'Marca' && brandOptions;
            const isModel = f.label === 'Modello' && modelOptionsFor;
            const currentBrand = fields.find((ff) => ff.label === 'Marca')?.value ?? '';
            const models = isModel ? modelOptionsFor!(currentBrand) : [];
            return (
              <div key={f.label}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                {f.label === 'Codice' ? (
                  <div className="flex gap-1">
                    <input
                      value={f.value}
                      onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="flex items-center justify-center px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Scansiona QR code"
                    >
                      <ScanLine size={18} />
                    </button>
                  </div>
                ) : isBrand ? (
                  customBrand ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={f.value}
                        onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                        placeholder="Inserisci marca"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <button
                        type="button"
                        onClick={() => { onChange(i, ''); setCustomBrand(false); }}
                        className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"
                        title="Torna al menu"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={f.value}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (val === '__CUSTOM') { onChange(i, ''); setCustomBrand(true); }
                        else onChange(i, val);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">— Seleziona —</option>
                      {brandOptions!.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__custom">Altro...</option>
                    </select>
                  )
                ) : isModel && models.length > 0 ? (
                  customModel ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={f.value}
                        onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                        placeholder="Inserisci modello"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <button
                        type="button"
                        onClick={() => { onChange(i, ''); setCustomModel(false); }}
                        className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"
                        title="Torna al menu"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={f.value}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (val === '__CUSTOM') { onChange(i, ''); setCustomModel(true); }
                        else onChange(i, val);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">— Seleziona —</option>
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="__custom">Altro...</option>
                    </select>
                  )
                ) : (
                  <input
                    value={f.value}
                    onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                )}
              </div>
            );
          })}
          {extraField && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{extraField.label}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={extraField.value}
                onChange={(e) => onChangeExtra?.(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Annulla
          </button>
        </div>
        {showScanner && (
          <EquipmentScannerModal
            onClose={() => setShowScanner(false)}
            onScan={(text) => {
              onChange(fields.findIndex((f) => f.label === 'Codice'), text.toUpperCase());
              setShowScanner(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
      <div className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg text-slate-500 text-sm font-semibold flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        {hasData ? (
          <div className="text-sm text-slate-900">
            {fields.map((f, i) => (
              <span key={f.label}>
                {i > 0 && <span className="text-slate-300 mx-1.5">·</span>}
                {f.value && <span className="font-medium">{f.value}</span>}
              </span>
            ))}
            {extraField && extraField.value && (
              <span className="text-slate-500 ml-1.5">· {extraField.value} kW</span>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic">Nuova voce — compila e salva</div>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FileText size={16} />
        </button>
        <button
          onClick={() => setConfirmDel(true)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
