import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CalendarDays, CheckCircle2, Download, Euro, FileSpreadsheet, Loader2, Mail, Paperclip, Pencil, Phone, Plus, Search, StickyNote, Trash2, Upload, X } from 'lucide-react';
import type { QuoteRequest, QuoteRequestFile, QuoteRequestInsert, QuoteStatus, QuoteTypeOption } from '@/lib/types';
import { createQuoteRequest, deleteQuoteRequest, deleteQuoteRequestFile, downloadQuoteRequestFile, fetchQuoteRequestFiles, fetchQuoteRequests, fetchQuoteTypeOptions, rememberQuoteTypeOption, updateQuoteRequest, uploadQuoteRequestFile } from '@/lib/api';
import { saveAs } from 'file-saver';
import { extractQuoteValueFromFiles, type QuoteValueExtractionResult } from '@/lib/quote-value-extraction';

const STATUSES: QuoteStatus[] = ['DA VERIFICARE','DA GESTIRE','IN PREPARAZIONE','INVIATO','ACCETTATO','RIFIUTATO','SOSPESO'];
const COLORS = ['#2563eb','#ef4444','#16a34a','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#64748b'];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';

const money = (value: number | null) => value == null ? '—' : value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const displayDate = (value: string | null) => value ? value.split('-').reverse().join('/') : '—';

function displayDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeSource(value: string | null | undefined): string {
  const upper = (value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!upper) return '';
  const match = upper.match(/^(?:REFERENZA|REFERENZE|REF\.?)\s*(.*)$/);
  if (!match) return upper;
  return match[1] ? `REF. ${match[1]}` : 'REF.';
}

function statusClass(status: QuoteStatus) {
  if (status === 'ACCETTATO') return 'bg-green-100 text-green-700';
  if (status === 'RIFIUTATO') return 'bg-red-100 text-red-700';
  if (status === 'INVIATO') return 'bg-blue-100 text-blue-700';
  if (status === 'IN PREPARAZIONE') return 'bg-amber-100 text-amber-800';
  if (status === 'SOSPESO') return 'bg-slate-200 text-slate-700';
  return 'bg-orange-100 text-orange-700';
}

export function QuoteDashboard() {
  const [rows, setRows] = useState<QuoteRequest[]>([]);
  const [quoteFiles, setQuoteFiles] = useState<QuoteRequestFile[]>([]);
  const [quoteTypeOptions, setQuoteTypeOptions] = useState<QuoteTypeOption[]>([]);
  const [uploadingQuoteId, setUploadingQuoteId] = useState<string | null>(null);
  const [clearingNoteId, setClearingNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuoteRequest | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState<'TUTTI' | QuoteStatus>('TUTTI');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [requests, files, typeOptions] = await Promise.all([
        fetchQuoteRequests(),
        fetchQuoteRequestFiles(),
        fetchQuoteTypeOptions(),
      ]);
      setRows(requests);
      setQuoteFiles(files);
      setQuoteTypeOptions(typeOptions);
      setError(null);
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Impossibile caricare i preventivi.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const years = useMemo(() => {
    const ys = new Set(rows.map((r) => r.quote_year));
    ys.add(currentYear);
    return [...ys].sort((a,b) => b-a);
  }, [rows, currentYear]);

  const filesByQuote = useMemo(() => {
    const map = new Map<string, QuoteRequestFile[]>();
    quoteFiles.forEach((file) => {
      const list = map.get(file.quote_request_id) ?? [];
      list.push(file);
      map.set(file.quote_request_id, list);
    });
    return map;
  }, [quoteFiles]);

  const yearRows = rows.filter((r) => r.quote_year === year);
  const filtered = yearRows.filter((r) => {
    const q = search.trim().toLocaleLowerCase('it');
    const hit = !q || [r.client, r.client_email ?? '', r.client_phone ?? '', r.source ?? '', r.quote_type ?? '', r.notes ?? '', `${r.progressive_number}/${r.series}`]
      .some((v) => v.toLocaleLowerCase('it').includes(q));
    return hit && (statusFilter === 'TUTTI' || r.status === statusFilter);
  });

  const totalValue = yearRows.reduce((sum, r) => sum + Number(r.value_ex_vat ?? 0), 0);
  const sent = yearRows.filter((r) => r.status === 'INVIATO').length;
  const accepted = yearRows.filter((r) => r.status === 'ACCETTATO').length;

  const sourceData = useMemo(() => {
    const map = new Map<string, number>();
    yearRows.forEach((r) => {
      const key = normalizeSource(r.source) || 'NON INDICATA';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const sorted = [...map.entries()].sort((a,b) => b[1]-a[1]);
    if (sorted.length <= 7) return sorted;
    const top = sorted.slice(0, 7);
    top.push(['ALTRO', sorted.slice(7).reduce((s, [,n]) => s+n, 0)]);
    return top;
  }, [yearRows]);

  const gradient = useMemo(() => {
    const total = sourceData.reduce((s,[,n]) => s+n,0) || 1;
    let cursor = 0;
    return sourceData.map(([,n],i) => {
      const start = cursor;
      cursor += n / total * 100;
      return `${COLORS[i % COLORS.length]} ${start}% ${cursor}%`;
    }).join(', ');
  }, [sourceData]);

  const save = async (input: QuoteRequestInsert, pendingFiles: File[]) => {
    const saved = editing && editing !== 'new'
      ? await updateQuoteRequest(editing.id, input)
      : await createQuoteRequest(input);

    if (editing && editing !== 'new') {
      setRows((prev) => prev.map((r) => r.id === saved.id ? saved : r));
    } else {
      setRows((prev) => [saved, ...prev]);
      setYear(saved.quote_year);
    }

    if (pendingFiles.length > 0) {
      setUploadingQuoteId(saved.id);
      try {
        const uploadedFiles: QuoteRequestFile[] = [];
        for (const file of pendingFiles) {
          uploadedFiles.push(await uploadQuoteRequestFile(saved.id, file));
        }
        setQuoteFiles((prev) => [...uploadedFiles, ...prev]);
      } catch (err) {
        setError(err instanceof Error
          ? `Preventivo salvato, ma almeno un allegato non è stato caricato: ${err.message}`
          : 'Preventivo salvato, ma almeno un allegato non è stato caricato.');
      } finally {
        setUploadingQuoteId(null);
      }
    }

    setEditing(null);
  };

  const remove = async (row: QuoteRequest) => {
    if (!window.confirm(`Eliminare definitivamente il preventivo ${row.progressive_number}/${row.series} - ${row.client}? Verranno eliminati anche i file allegati.`)) return;
    try {
      await deleteQuoteRequest(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setQuoteFiles((prev) => prev.filter((file) => file.quote_request_id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione preventivo non riuscita.');
    }
  };

  const uploadFiles = async (quoteId: string, files: File[]) => {
    if (files.length === 0) return;
    setUploadingQuoteId(quoteId);
    setError(null);
    try {
      for (const file of files) {
        const uploaded = await uploadQuoteRequestFile(quoteId, file);
        setQuoteFiles((prev) => [uploaded, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caricamento file non riuscito.');
    } finally {
      setUploadingQuoteId(null);
    }
  };

  const downloadFile = async (file: QuoteRequestFile) => {
    try {
      const blob = await downloadQuoteRequestFile(file);
      saveAs(blob, file.file_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download file non riuscito.');
    }
  };

  const removeFile = async (file: QuoteRequestFile) => {
    if (!window.confirm(`Eliminare definitivamente il file "${file.file_name}"?`)) return;
    try {
      await deleteQuoteRequestFile(file);
      setQuoteFiles((prev) => prev.filter((item) => item.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione file non riuscita.');
    }
  };

  const clearNote = async (row: QuoteRequest) => {
    setClearingNoteId(row.id);
    setError(null);
    try {
      const saved = await updateQuoteRequest(row.id, { notes: null });
      setRows((prev) => prev.map((item) => item.id === saved.id ? saved : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile chiudere la nota. Riprova.');
    } finally {
      setClearingNoteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 lg:p-8">
      <header className="mb-6 rounded-2xl bg-blue-900 p-5 text-white lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-[10px] font-semibold tracking-widest text-red-300">AMMINISTRAZIONE</div>
            <h1 className="text-2xl font-bold">Richieste Preventivi</h1>
            <p className="mt-1 text-sm text-slate-300">Registro progressivo, provenienza, stato e valore delle richieste.</p>
          </div>
          <button onClick={() => setEditing('new')} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
            <Plus size={18}/> Nuovo preventivo
          </button>
        </div>
      </header>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="mr-2 inline"/>{error}</div>}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={FileSpreadsheet} label="Richieste anno" value={String(yearRows.length)} />
        <Kpi icon={CalendarDays} label="Inviati" value={String(sent)} />
        <Kpi icon={CheckCircle2} label="Accettati" value={String(accepted)} />
        <Kpi icon={Euro} label="Valore inserito" value={money(totalValue)} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.05fr_1.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Da dove arrivano le richieste</h2>
          <p className="mb-4 text-xs text-slate-500">Distribuzione percentuale delle richieste {year}.</p>
          {yearRows.length === 0 ? <p className="py-16 text-center text-sm text-slate-400">Nessun dato per l'anno selezionato.</p> : (
            <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
              <div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
                <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-3xl font-bold text-blue-900">{yearRows.length}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">richieste</span>
                </div>
              </div>
              <div className="w-full space-y-2">
                {sourceData.map(([label, count], i) => {
                  const pct = yearRows.length ? Math.round(count / yearRows.length * 100) : 0;
                  return <div key={label} className="flex items-center gap-2 text-xs">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{label}</span>
                    <span className="font-bold text-slate-900">{pct}%</span>
                    <span className="w-7 text-right text-slate-400">{count}</span>
                  </div>;
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="relative min-w-[220px] flex-1">
              <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca cliente, ref., tipo..." className={inputClass + ' pl-9'} />
            </label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'TUTTI' | QuoteStatus)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="TUTTI">Tutti gli stati</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {loading ? <div className="py-16 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></div> :
          filtered.length === 0 ? <p className="py-16 text-center text-sm text-slate-400">Nessun preventivo corrisponde ai filtri.</p> :
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((r) => (
              <article key={r.id} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 px-2.5 py-2 text-sm font-bold text-blue-900">{r.progressive_number}/{r.series}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{r.client}</h3>
                      <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + statusClass(r.status)}>{r.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{displayDate(r.request_date)} · {normalizeSource(r.source) || 'REF. NON INDICATA'}</p>
                    {(r.client_email || r.client_phone) && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {r.client_email && <span className="inline-flex items-center gap-1"><Mail size={12}/>{r.client_email}</span>}
                        {r.client_phone && <span className="inline-flex items-center gap-1"><Phone size={12}/>{r.client_phone}</span>}
                      </div>
                    )}
                    <p className="mt-1 text-sm text-slate-700">{r.quote_type || 'TIPO PREVENTIVO NON INDICATO'}</p>
                    {r.value_ex_vat != null && <p className="mt-1 text-xs text-slate-500">VALORE: {money(r.value_ex_vat)}</p>}
                    {r.site_visit_at && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs text-blue-900">
                        <CalendarClock size={14} className="mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold">Sopralluogo programmato</span>
                          <span className="ml-1.5">{displayDateTime(r.site_visit_at)}</span>
                        </div>
                      </div>
                    )}
                    {r.notes && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-slate-700">
                        <StickyNote size={14} className="mt-0.5 shrink-0 text-amber-700" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-amber-900">Note</span>
                          <span className="ml-1.5 whitespace-pre-wrap">{r.notes}</span>
                        </div>
                        <button
                          type="button"
                          disabled={clearingNoteId === r.id}
                          onClick={() => { void clearNote(r); }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                          aria-label={`Segna come svolta la nota di ${r.client}`}
                        >
                          {clearingNoteId === r.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                          Svolto
                        </button>
                      </div>
                    )}
                    <QuoteAttachments
                      files={filesByQuote.get(r.id) ?? []}
                      uploading={uploadingQuoteId === r.id}
                      onUpload={(selected) => { void uploadFiles(r.id, selected); }}
                      onDownload={(file) => { void downloadFile(file); }}
                      onDelete={(file) => { void removeFile(file); }}
                    />
                  </div>
                  <button onClick={() => setEditing(r)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Modifica preventivo"><Pencil size={16}/></button>
                  <button onClick={() => void remove(r)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Elimina preventivo"><Trash2 size={16}/></button>
                </div>
              </article>
            ))}
          </div>}
        </section>
      </div>

      {editing && (
        <QuoteFormModal
          person={editing === 'new' ? null : editing}
          rows={rows}
          quoteTypeOptions={quoteTypeOptions}
          onRememberQuoteType={async (label) => {
            const option = await rememberQuoteTypeOption(label);
            setQuoteTypeOptions((previous) => {
              const withoutCurrent = previous.filter((item) => item.id !== option.id);
              return [...withoutCurrent, option].sort((a, b) =>
                a.sort_order - b.sort_order || a.label.localeCompare(b.label, 'it')
              );
            });
            return option;
          }}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function QuoteAttachments({ files, uploading, onUpload, onDownload, onDelete }: {
  files: QuoteRequestFile[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onDownload: (file: QuoteRequestFile) => void;
  onDelete: (file: QuoteRequestFile) => void;
}) {
  return <div className="mt-2 border-t border-slate-100 pt-2">
    <div className="flex flex-wrap items-center gap-2">
      <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${uploading ? 'cursor-wait border-slate-200 bg-slate-100 text-slate-400' : 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'}`}>
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'Caricamento...' : 'Carica preventivo'}
        <input
          type="file"
          multiple
          disabled={uploading}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.currentTarget.files ?? []);
            e.currentTarget.value = '';
            onUpload(selected);
          }}
        />
      </label>
      {files.length > 0 && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Paperclip size={12}/>{files.length} {files.length === 1 ? 'allegato' : 'allegati'}</span>}
    </div>
    {files.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {files.map((file) => (
          <div key={file.id} className="inline-flex max-w-full items-center rounded-lg border border-slate-200 bg-slate-50 text-xs">
            <button type="button" onClick={() => onDownload(file)}
              className="inline-flex min-w-0 items-center gap-1.5 px-2 py-1.5 text-slate-700 hover:text-blue-900"
              title={file.file_name}>
              <Download size={13} className="shrink-0" />
              <span className="max-w-[180px] truncate">{file.file_name}</span>
            </button>
            <button type="button" onClick={() => onDelete(file)}
              className="border-l border-slate-200 p-1.5 text-red-600 hover:bg-red-50"
              aria-label={`Elimina ${file.file_name}`}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    )}
    <p className="mt-1 text-[10px] text-slate-400">PDF, foto, Word o Excel · massimo 20 MB per file</p>
  </div>;
}

function Kpi({ icon: Icon, label, value }: { icon: typeof FileSpreadsheet; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <Icon size={18} className="mb-2 text-blue-900"/>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>;
}

function QuoteFormModal({ person, rows, quoteTypeOptions, onRememberQuoteType, onClose, onSave }: {
  person: QuoteRequest | null;
  rows: QuoteRequest[];
  quoteTypeOptions: QuoteTypeOption[];
  onRememberQuoteType: (label: string) => Promise<QuoteTypeOption>;
  onClose: () => void;
  onSave: (input: QuoteRequestInsert, files: File[]) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0,10);
  const initialYear = person?.quote_year ?? new Date().getFullYear();
  const nextFor = (y: number) => Math.max(0, ...rows.filter((r) => r.quote_year === y).map((r) => r.progressive_number)) + 1;
  const [requestDate, setRequestDate] = useState(person?.request_date ?? today);
  const [year, setYear] = useState(initialYear);
  const [progressive, setProgressive] = useState(person?.progressive_number ?? nextFor(initialYear));
  const [source, setSource] = useState(person?.source ?? '');
  const [client, setClient] = useState(person?.client ?? '');
  const [clientEmail, setClientEmail] = useState(person?.client_email ?? '');
  const [clientPhone, setClientPhone] = useState(person?.client_phone ?? '');
  const [siteVisitAt, setSiteVisitAt] = useState(toDateTimeLocal(person?.site_visit_at));
  const [quoteType, setQuoteType] = useState(person?.quote_type ?? '');
  const [value, setValue] = useState(person?.value_ex_vat != null ? String(person.value_ex_vat) : '');
  const [status, setStatus] = useState<QuoteStatus>(person?.status ?? 'DA GESTIRE');
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [analyzingFiles, setAnalyzingFiles] = useState(false);
  const [extractionResult, setExtractionResult] = useState<QuoteValueExtractionResult | null>(null);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sources = [...new Set([
    ...rows.map((r) => normalizeSource(r.source)).filter(Boolean),
    'ALTRO',
  ])]
    .filter((source) => !['CLIENTI', 'DAVIDE B'].includes(source.trim().toUpperCase()))
    .sort((a,b) => a.localeCompare(b,'it'));

  const changeDate = (v: string) => {
    setRequestDate(v);
    if (!person && v) {
      const y = Number(v.slice(0,4));
      setYear(y);
      setProgressive(nextFor(y));
    }
  };

  const analyzeAndQueueFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    const oversized = selectedFiles.find((file) => file.size > 20 * 1024 * 1024);
    if (oversized) {
      setError(`Il file "${oversized.name}" supera il limite di 20 MB.`);
      return;
    }

    const nextFiles = [...pendingFiles];
    selectedFiles.forEach((file) => {
      const duplicate = nextFiles.some((current) =>
        current.name === file.name &&
        current.size === file.size &&
        current.lastModified === file.lastModified
      );
      if (!duplicate) nextFiles.push(file);
    });
    setPendingFiles(nextFiles);
    setAnalyzingFiles(true);
    setError(null);
    setExtractionWarnings([]);

    try {
      const extraction = await extractQuoteValueFromFiles(nextFiles);
      setExtractionWarnings(extraction.warnings);
      setExtractionResult(extraction.result);

      if (extraction.result) {
        setValue(String(extraction.result.value));
      }
    } catch (err) {
      setExtractionResult(null);
      setExtractionWarnings([
        err instanceof Error ? err.message : 'Analisi automatica del documento non riuscita.',
      ]);
    } finally {
      setAnalyzingFiles(false);
    }
  };

  const submit = async () => {
    if (!client.trim()) return;
    setBusy(true); setError(null);
    try {
      await onSave({
        progressive_number: progressive,
        series: 'FV',
        quote_year: year,
        request_date: requestDate || null,
        source: normalizeSource(source) || null,
        client: client.trim().toUpperCase(),
        client_email: clientEmail.trim().toLowerCase() || null,
        client_phone: clientPhone.trim() || null,
        site_visit_at: siteVisitAt ? new Date(siteVisitAt).toISOString() : null,
        quote_type: quoteType.trim().toUpperCase() || null,
        value_ex_vat: value === '' ? null : Number(value),
        status,
        notes: notes.trim().toUpperCase() || null,
      }, pendingFiles);
    } catch (err) { setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
    <div
      className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      onKeyDownCapture={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{person ? 'Modifica richiesta preventivo' : 'Nuova richiesta preventivo'}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500"><X size={20}/></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">N° progressivo
          <input type="number" min="1" required value={progressive} onChange={(e) => setProgressive(Number(e.target.value))} className={inputClass + ' mt-1'} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Data richiesta
          <input type="date" value={requestDate} onChange={(e) => changeDate(e.target.value)} className={inputClass + ' mt-1'} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Da dove arriva / ref.
          <input list="quote-sources" value={source} onChange={(e) => setSource(e.target.value.toUpperCase())} className={inputClass + ' mt-1'} placeholder="SITO, CLIENTE, NICOLA..." />
          <datalist id="quote-sources">{sources.map((s) => <option key={s} value={s}/>)}</datalist>
        </label>
        <label className="text-xs font-semibold text-slate-600">Cliente *
          <input required value={client} onChange={(e) => setClient(e.target.value.toUpperCase())} className={inputClass + ' mt-1'} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Email cliente
          <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} autoCapitalize="none" spellCheck={false} className={inputClass + ' mt-1'} placeholder="nome@azienda.it" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Telefono cliente
          <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass + ' mt-1'} placeholder="+39 ..." />
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Sopralluogo programmato
          <input
            type="datetime-local"
            value={siteVisitAt}
            onChange={(e) => setSiteVisitAt(e.target.value)}
            className={inputClass + ' mt-1'}
          />
          <span className="mt-1 block text-[10px] font-normal text-slate-400">Seleziona giorno e orario del sopralluogo. Lascia vuoto se non è ancora programmato.</span>
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Tipo di impianto
          <select
            value={quoteType}
            onChange={(e) => {
              const next = e.target.value;
              if (next !== '__OTHER__') {
                setQuoteType(next);
                return;
              }
              const raw = window.prompt('Inserisci il nuovo tipo di impianto. Verrà memorizzato nel menu per i prossimi preventivi.');
              if (!raw?.trim()) return;
              setBusy(true);
              setError(null);
              void onRememberQuoteType(raw.trim().toUpperCase())
                .then((option) => setQuoteType(option.label))
                .catch((err) => setError(err instanceof Error ? err.message : 'Impossibile memorizzare il nuovo tipo di impianto.'))
                .finally(() => setBusy(false));
            }}
            className={inputClass + ' mt-1'}
          >
            <option value="">Seleziona tipo di impianto</option>
            {quoteType && !quoteTypeOptions.some((option) => option.label === quoteType) && (
              <option value={quoteType}>{quoteType}</option>
            )}
            {quoteTypeOptions.map((option) => (
              <option key={option.id} value={option.label}>{option.label}</option>
            ))}
            <option value="__OTHER__">Altro…</option>
          </select>
          <span className="mt-1 block text-[10px] font-normal text-slate-400">Con “Altro…” la nuova voce viene aggiunta automaticamente al menu.</span>
        </label>
        <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={`inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-900 ${analyzingFiles ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-blue-50'}`}>
              {analyzingFiles ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {analyzingFiles ? 'Analisi documento...' : 'Carica preventivo e rileva valore'}
              <input
                type="file"
                multiple
                disabled={analyzingFiles || busy}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.currentTarget.files ?? []);
                  e.currentTarget.value = '';
                  void analyzeAndQueueFiles(selected);
                }}
              />
            </label>
            {pendingFiles.length > 0 && (
              <span className="text-[11px] text-slate-500">
                {pendingFiles.length} {pendingFiles.length === 1 ? 'file pronto' : 'file pronti'} per il salvataggio
              </span>
            )}
          </div>

          {pendingFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pendingFiles.map((file, index) => (
                <span key={`${file.name}-${file.size}-${file.lastModified}`} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700">
                  <Paperclip size={11} className="shrink-0" />
                  <span className="max-w-[210px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFiles((files) => files.filter((_, currentIndex) => currentIndex !== index));
                      if (extractionResult?.fileName === file.name) setExtractionResult(null);
                    }}
                    className="ml-1 rounded p-0.5 text-red-600 hover:bg-red-50"
                    aria-label={`Rimuovi ${file.name}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {extractionResult && (
            <p className={`mt-2 rounded-lg px-2.5 py-2 text-xs ${extractionResult.confidence === 'high' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
              <strong>Valore rilevato automaticamente:</strong>{' '}
              {money(extractionResult.value)} · {extractionResult.label} · {extractionResult.fileName}.
              {' '}Verifica il valore prima di salvare.
            </p>
          )}

          {!analyzingFiles && pendingFiles.length > 0 && !extractionResult && (
            <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
              Non ho individuato con sufficiente affidabilità il totale senza IVA. Il file verrà comunque allegato: inserisci il valore manualmente.
            </p>
          )}

          {extractionWarnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {extractionWarnings.map((warning) => (
                <p key={warning} className="text-[10px] text-slate-500">{warning}</p>
              ))}
            </div>
          )}
        </div>

        <label className="text-xs font-semibold text-slate-600">Valore senza IVA
          <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass + ' mt-1'}
          />
          <span className="mt-1 block text-[10px] font-normal text-slate-400">
            Se carichi il preventivo, il sistema prova a compilare automaticamente questo importo.
          </span>
        </label>
        <label className="text-xs font-semibold text-slate-600">Stato
          <select value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)} className={inputClass + ' mt-1'}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Note
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value.toUpperCase())} className={inputClass + ' mt-1 resize-none'} />
        </label>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => { void submit(); }}
          disabled={busy || analyzingFiles || !client.trim()}
          className="flex-1 rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Salvataggio...' : 'Salva'}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700">Annulla</button>
      </div>
    </div>
  </div>;
}
