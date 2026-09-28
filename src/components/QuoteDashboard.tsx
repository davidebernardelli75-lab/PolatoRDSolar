import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Euro, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { QuoteRequest, QuoteRequestInsert, QuoteStatus } from '@/lib/types';
import { createQuoteRequest, deleteQuoteRequest, fetchQuoteRequests, updateQuoteRequest } from '@/lib/api';

const STATUSES: QuoteStatus[] = ['DA VERIFICARE','DA GESTIRE','IN PREPARAZIONE','INVIATO','ACCETTATO','RIFIUTATO','SOSPESO'];
const COLORS = ['#2563eb','#ef4444','#16a34a','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#64748b'];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';

const money = (value: number | null) => value == null ? '—' : value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const displayDate = (value: string | null) => value ? value.split('-').reverse().join('/') : '—';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuoteRequest | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState<'TUTTI' | QuoteStatus>('TUTTI');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchQuoteRequests()); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Impossibile caricare i preventivi.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const years = useMemo(() => {
    const ys = new Set(rows.map((r) => r.quote_year));
    ys.add(currentYear);
    return [...ys].sort((a,b) => b-a);
  }, [rows, currentYear]);

  const yearRows = rows.filter((r) => r.quote_year === year);
  const filtered = yearRows.filter((r) => {
    const q = search.trim().toLocaleLowerCase('it');
    const hit = !q || [r.client, r.source ?? '', r.quote_type ?? '', r.notes ?? '', `${r.progressive_number}/${r.series}`]
      .some((v) => v.toLocaleLowerCase('it').includes(q));
    return hit && (statusFilter === 'TUTTI' || r.status === statusFilter);
  });

  const totalValue = yearRows.reduce((sum, r) => sum + Number(r.value_ex_vat ?? 0), 0);
  const sent = yearRows.filter((r) => r.status === 'INVIATO').length;
  const accepted = yearRows.filter((r) => r.status === 'ACCETTATO').length;

  const sourceData = useMemo(() => {
    const map = new Map<string, number>();
    yearRows.forEach((r) => {
      const key = (r.source?.trim() || 'NON INDICATA').toUpperCase();
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

  const save = async (input: QuoteRequestInsert) => {
    if (editing && editing !== 'new') {
      const saved = await updateQuoteRequest(editing.id, input);
      setRows((prev) => prev.map((r) => r.id === saved.id ? saved : r));
    } else {
      const saved = await createQuoteRequest(input);
      setRows((prev) => [saved, ...prev]);
      setYear(saved.quote_year);
    }
    setEditing(null);
  };

  const remove = async (row: QuoteRequest) => {
    if (!window.confirm(`Eliminare definitivamente il preventivo ${row.progressive_number}/${row.series} - ${row.client}?`)) return;
    await deleteQuoteRequest(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca cliente, referenza, tipo..." className={inputClass + ' pl-9'} />
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
                    <p className="mt-0.5 text-xs text-slate-500">{displayDate(r.request_date)} · {r.source || 'REFERENZA NON INDICATA'}</p>
                    <p className="mt-1 text-sm text-slate-700">{r.quote_type || 'TIPO PREVENTIVO NON INDICATO'}</p>
                    {(r.value_ex_vat != null || r.notes) && <p className="mt-1 text-xs text-slate-500">{r.value_ex_vat != null ? `VALORE: ${money(r.value_ex_vat)}` : ''}{r.value_ex_vat != null && r.notes ? ' · ' : ''}{r.notes || ''}</p>}
                  </div>
                  <button onClick={() => setEditing(r)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Modifica preventivo"><Pencil size={16}/></button>
                  <button onClick={() => void remove(r)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Elimina preventivo"><Trash2 size={16}/></button>
                </div>
              </article>
            ))}
          </div>}
        </section>
      </div>

      {editing && <QuoteFormModal person={editing === 'new' ? null : editing} rows={rows} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof FileSpreadsheet; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <Icon size={18} className="mb-2 text-blue-900"/>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>;
}

function QuoteFormModal({ person, rows, onClose, onSave }: {
  person: QuoteRequest | null;
  rows: QuoteRequest[];
  onClose: () => void;
  onSave: (input: QuoteRequestInsert) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0,10);
  const initialYear = person?.quote_year ?? new Date().getFullYear();
  const nextFor = (y: number) => Math.max(0, ...rows.filter((r) => r.quote_year === y).map((r) => r.progressive_number)) + 1;
  const [requestDate, setRequestDate] = useState(person?.request_date ?? today);
  const [year, setYear] = useState(initialYear);
  const [progressive, setProgressive] = useState(person?.progressive_number ?? nextFor(initialYear));
  const [source, setSource] = useState(person?.source ?? '');
  const [client, setClient] = useState(person?.client ?? '');
  const [quoteType, setQuoteType] = useState(person?.quote_type ?? '');
  const [value, setValue] = useState(person?.value_ex_vat != null ? String(person.value_ex_vat) : '');
  const [status, setStatus] = useState<QuoteStatus>(person?.status ?? 'DA GESTIRE');
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sources = [...new Set(rows.map((r) => r.source).filter(Boolean) as string[])].sort((a,b) => a.localeCompare(b,'it'));

  const changeDate = (v: string) => {
    setRequestDate(v);
    if (!person && v) {
      const y = Number(v.slice(0,4));
      setYear(y);
      setProgressive(nextFor(y));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim()) return;
    setBusy(true); setError(null);
    try {
      await onSave({
        progressive_number: progressive,
        series: 'FV',
        quote_year: year,
        request_date: requestDate || null,
        source: source.trim().toUpperCase() || null,
        client: client.trim().toUpperCase(),
        quote_type: quoteType.trim().toUpperCase() || null,
        value_ex_vat: value === '' ? null : Number(value),
        status,
        notes: notes.trim().toUpperCase() || null,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
    <form onSubmit={(e) => void submit(e)} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
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
        <label className="text-xs font-semibold text-slate-600">Da dove arriva / referenza
          <input list="quote-sources" value={source} onChange={(e) => setSource(e.target.value.toUpperCase())} className={inputClass + ' mt-1'} placeholder="SITO, CLIENTE, NICOLA..." />
          <datalist id="quote-sources">{sources.map((s) => <option key={s} value={s}/>)}</datalist>
        </label>
        <label className="text-xs font-semibold text-slate-600">Cliente *
          <input required value={client} onChange={(e) => setClient(e.target.value.toUpperCase())} className={inputClass + ' mt-1'} />
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Tipo preventivo
          <input value={quoteType} onChange={(e) => setQuoteType(e.target.value.toUpperCase())} className={inputClass + ' mt-1'} placeholder="FOTOVOLTAICO, ACCUMULO, WALLBOX..." />
        </label>
        <label className="text-xs font-semibold text-slate-600">Valore senza IVA
          <input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass + ' mt-1'} />
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
        <button type="submit" disabled={busy || !client.trim()} className="flex-1 rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Salvataggio...' : 'Salva'}</button>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700">Annulla</button>
      </div>
    </form>
  </div>;
}
