import { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import type { Panel } from '@/lib/types';

export function PanelRow({
  panel,
  index,
  onUpdate,
  onDelete,
}: {
  panel: Panel;
  index: number;
  onUpdate: (serial: string, notes: string | null) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [serial, setSerial] = useState(panel.serial_number);
  const [notes, setNotes] = useState(panel.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(serial, notes || null);
      setEditing(false);
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium">Pannello {index + 1}</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Matricola / Barcode</label>
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
          />
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
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
      <div className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg text-slate-500 text-sm font-semibold flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium text-slate-900 break-all">
          {panel.serial_number}
        </div>
        {panel.notes && <div className="text-xs text-slate-400 mt-0.5">{panel.notes}</div>}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FileText size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
