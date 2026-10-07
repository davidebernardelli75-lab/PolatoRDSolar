import { useEffect, useState, useRef } from 'react';
import { Upload, Trash2, Loader2, Image as ImageIcon, Maximize2, X } from 'lucide-react';
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
  const [previewPhoto, setPreviewPhoto] = useState<PanelPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewPhoto) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewPhoto(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewPhoto]);

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
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                {url ? (
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(photo)}
                    className="absolute inset-0 block h-full w-full cursor-zoom-in"
                    aria-label={`Ingrandisci ${photo.file_name}`}
                  >
                    <img src={url} alt={photo.file_name} className="h-full w-full object-cover" />
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <Maximize2 size={12} /> Apri
                    </span>
                  </button>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="animate-spin text-slate-400" size={20} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeletePhoto(photo);
                  }}
                  className="absolute bottom-2 right-2 rounded-lg bg-red-500 p-2 text-white shadow-md transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Elimina ${photo.file_name}`}
                >
                  <Trash2 size={14} />
                </button>
                {panel && (
                  <div className="pointer-events-none absolute left-2 top-2 max-w-[75%] truncate rounded bg-blue-900/80 px-1.5 py-0.5 text-[10px] text-white">
                    {panel.serial_number.slice(0, 12)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewPhoto && photoUrls[previewPhoto.id] && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Anteprima foto impianto"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative flex max-h-full w-full max-w-5xl flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute right-1 top-1 z-10 rounded-full bg-black/65 p-2.5 text-white shadow-lg hover:bg-black/80"
              aria-label="Chiudi anteprima"
            >
              <X size={22} />
            </button>
            <img
              src={photoUrls[previewPhoto.id]}
              alt={previewPhoto.file_name}
              className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <div className="mt-3 max-w-full rounded-lg bg-black/55 px-3 py-2 text-center text-xs text-white">
              <span className="break-all">{previewPhoto.file_name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
