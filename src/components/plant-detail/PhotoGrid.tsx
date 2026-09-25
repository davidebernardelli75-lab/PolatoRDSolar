import { useState, useRef } from 'react';
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Panel, PanelPhoto } from '@/lib/types';
import { uploadPhoto } from '@/lib/api';

export function PhotoGrid({
  plantId,
  panels,
  photos,
  photoUrls,
  onUploaded,
  onDeletePhoto,
}: {
  plantId: string;
  panels: Panel[];
  photos: PanelPhoto[];
  photoUrls: Record<string, string>;
  onUploaded: () => void;
  onDeletePhoto: (photo: PanelPhoto) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const panelId = selectedPanel || null;
    try {
      for (const file of Array.from(files)) {
        await uploadPhoto(plantId, file, panelId);
      }
      onUploaded();
    } catch {
      // skip
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <ImageIcon size={18} />
          Foto ({photos.length})
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 space-y-3">
        {panels.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Associa foto al pannello (opzionale)
            </label>
            <select
              value={selectedPanel}
              onChange={(e) => setSelectedPanel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">Nessun pannello specifico</option>
              {panels.map((p, i) => (
                <option key={p.id} value={p.id}>
                  Pannello {i + 1} - {p.serial_number}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
          {uploading ? 'Caricamento...' : 'Carica Foto'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUpload(e.target.files);
            }
          }}
        />
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 text-sm">Nessuna foto caricata.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => {
            const url = photoUrls[photo.id];
            const panel = photo.panel_id ? panels.find((p) => p.id === photo.panel_id) : null;
            return (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
              >
                {url ? (
                  <img src={url} alt={photo.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-slate-400" size={20} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                  <button
                    onClick={() => onDeletePhoto(photo)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {panel && (
                  <div className="absolute top-2 left-2 bg-blue-900/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {panel.serial_number.slice(0, 12)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
