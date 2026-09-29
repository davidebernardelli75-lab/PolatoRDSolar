import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  Plant,
  WorkReport,
  WorkReportMaterial,
  WorkReportMaterialCatalogEntry,
  WorkReportMaterialInput,
  WorkReportStatus,
  WorkReportWorker,
  WorkReportWorkerCatalogEntry,
  WorkReportWorkerInput,
} from '@/lib/types';
import {
  createWorkReport,
  deleteWorkReport,
  fetchPlants,
  fetchWorkReportLaborRateDefaults,
  fetchWorkReportMaterialCatalog,
  fetchWorkReportMaterialCostDefaults,
  fetchWorkReportMaterialCosts,
  fetchWorkReportMaterials,
  fetchWorkReports,
  fetchWorkReportWorkerCatalog,
  fetchWorkReportWorkerCosts,
  fetchWorkReportWorkers,
  replaceWorkReportMaterials,
  replaceWorkReportWorkers,
  setWorkReportMaterialCost,
  setWorkReportWorkerCost,
  updateWorkReport,
} from '@/lib/api';

interface WorkReportDashboardProps {
  isAdmin: boolean;
}

type WorkerDraft = { worker_name: string; hours: string; rate_type: string; notes: string };
type MaterialDraft = { description: string; quantity: string; unit: string; notes: string };

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';

function statusClass(status: WorkReportStatus): string {
  if (status === 'APPROVATO') return 'bg-green-100 text-green-700';
  if (status === 'DA_VERIFICARE') return 'bg-blue-100 text-blue-700';
  if (status === 'DA_CORREGGERE') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function displayDate(value: string): string {
  return value.split('-').reverse().join('/');
}

export function WorkReportDashboard({ isAdmin }: WorkReportDashboardProps) {
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [workers, setWorkers] = useState<WorkReportWorker[]>([]);
  const [materials, setMaterials] = useState<WorkReportMaterial[]>([]);
  const [materialCatalog, setMaterialCatalog] = useState<WorkReportMaterialCatalogEntry[]>([]);
  const [workerCatalog, setWorkerCatalog] = useState<WorkReportWorkerCatalogEntry[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [editing, setEditing] = useState<WorkReport | 'new' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'TUTTI' | WorkReportStatus>('TUTTI');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRows, workerRows, materialRows, plantRows, materialOptions, workerOptions] = await Promise.all([
        fetchWorkReports(),
        fetchWorkReportWorkers(),
        fetchWorkReportMaterials(),
        fetchPlants(),
        fetchWorkReportMaterialCatalog(),
        fetchWorkReportWorkerCatalog(),
      ]);
      setReports(reportRows);
      setWorkers(workerRows);
      setMaterials(materialRows);
      setPlants(plantRows);
      setMaterialCatalog(materialOptions);
      setWorkerCatalog(workerOptions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i rapportini.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const plantById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);
  const filtered = reports.filter((report) => statusFilter === 'TUTTI' || report.status === statusFilter);
  const pendingCount = reports.filter((report) => report.status === 'DA_VERIFICARE').length;
  const approvedCount = reports.filter((report) => report.status === 'APPROVATO').length;
  const totalHours = workers.reduce((sum, worker) => sum + Number(worker.hours || 0), 0);

  const review = async (report: WorkReport, status: 'APPROVATO' | 'DA_CORREGGERE') => {
    setBusyId(report.id);
    setError(null);
    try {
      await updateWorkReport(report.id, {
        status,
        approved_at: status === 'APPROVATO' ? new Date().toISOString() : null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aggiornamento rapportino non riuscito.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (report: WorkReport) => {
    if (!window.confirm(`Eliminare il rapportino del ${displayDate(report.report_date)}?`)) return;
    setBusyId(report.id);
    try {
      await deleteWorkReport(report.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione rapportino non riuscita.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 lg:p-8">
      <header className="mb-6 rounded-2xl bg-blue-900 p-5 text-white lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-[10px] font-semibold tracking-widest text-red-300">
              {isAdmin ? 'AMMINISTRAZIONE' : 'SQUADRA FV'}
            </div>
            <h1 className="text-2xl font-bold">Rapportini di lavoro</h1>
            <p className="mt-1 text-sm text-slate-300">
              Ore di manodopera, attività svolte e materiali utilizzati per ogni impianto.
            </p>
          </div>
          <button
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            <Plus size={18} /> Nuovo rapportino
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mr-2 inline" />{error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Rapportini" value={String(reports.length)} />
        <Kpi label="Da verificare" value={String(pendingCount)} />
        <Kpi label="Approvati" value={String(approvedCount)} />
        <Kpi label="Ore registrate" value={totalHours.toLocaleString('it-IT', { maximumFractionDigits: 2 })} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-blue-900" />
          <h2 className="font-semibold text-slate-900">{isAdmin ? 'Tutti i rapportini' : 'I miei rapportini'}</h2>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'TUTTI' | WorkReportStatus)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="TUTTI">Tutti gli stati</option>
          <option value="BOZZA">Bozza</option>
          <option value="DA_VERIFICARE">Da verificare</option>
          <option value="APPROVATO">Approvato</option>
          <option value="DA_CORREGGERE">Da correggere</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <ClipboardList size={34} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">Nessun rapportino disponibile.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const plant = plantById.get(report.plant_id);
            const reportWorkers = workers.filter((worker) => worker.report_id === report.id);
            const reportMaterials = materials.filter((material) => material.report_id === report.id);
            const hours = reportWorkers.reduce((sum, worker) => sum + Number(worker.hours || 0), 0);
            const expanded = expandedId === report.id;
            const editable = report.status === 'BOZZA' || report.status === 'DA_CORREGGERE';

            return (
              <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="rounded-xl bg-blue-50 px-3 py-2 text-center text-blue-900">
                    <div className="text-[10px] font-semibold uppercase">Data</div>
                    <div className="text-sm font-bold">{displayDate(report.report_date)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{plant?.owner_name ?? 'Impianto non disponibile'}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(report.status)}`}>
                        {report.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{plant?.address ?? ''}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><Users size={13} />{report.team_name}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} />{hours.toLocaleString('it-IT')} ore</span>
                      <span className="inline-flex items-center gap-1"><PackagePlus size={13} />{reportMaterials.length} materiali</span>
                    </div>
                    {report.work_description && <p className="mt-2 text-sm text-slate-700">{report.work_description}</p>}
                    {report.notes && <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">NOTE: {report.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    {editable && (
                      <button onClick={() => setEditing(report)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Modifica rapportino">
                        <Pencil size={17} />
                      </button>
                    )}
                    {editable && (
                      <button onClick={() => void remove(report)} disabled={busyId === report.id} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label="Elimina rapportino">
                        <Trash2 size={17} />
                      </button>
                    )}
                    <button onClick={() => setExpandedId(expanded ? null : report.id)} className="rounded-lg p-2 text-blue-900 hover:bg-blue-50" aria-label="Dettagli rapportino">
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Manodopera</h4>
                      {reportWorkers.length === 0 ? <p className="text-xs text-slate-400">Nessuna ora registrata.</p> : (
                        <div className="space-y-1.5">
                          {reportWorkers.map((worker) => (
                            <div key={worker.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                              <span>{worker.worker_name}</span>
                              <span className="font-semibold">{Number(worker.hours).toLocaleString('it-IT')} h</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Materiali utilizzati</h4>
                      {reportMaterials.length === 0 ? <p className="text-xs text-slate-400">Nessun materiale registrato.</p> : (
                        <div className="space-y-1.5">
                          {reportMaterials.map((material) => (
                            <div key={material.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <span>{material.description}</span>
                                <span className="shrink-0 font-semibold">{Number(material.quantity).toLocaleString('it-IT')} {material.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {expanded && isAdmin && (
                  <AdminReportCostEditor
                    workers={reportWorkers}
                    materials={reportMaterials}
                    workerCatalog={workerCatalog}
                    materialCatalog={materialCatalog}
                  />
                )}

                {isAdmin && report.status === 'DA_VERIFICARE' && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => void review(report, 'DA_CORREGGERE')}
                      disabled={busyId === report.id}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50"
                    >
                      Da correggere
                    </button>
                    <button
                      onClick={() => void review(report, 'APPROVATO')}
                      disabled={busyId === report.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busyId === report.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approva
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <WorkReportFormModal
          report={editing === 'new' ? null : editing}
          plants={plants}
          workers={editing === 'new' ? [] : workers.filter((worker) => worker.report_id === editing.id)}
          materials={editing === 'new' ? [] : materials.filter((material) => material.report_id === editing.id)}
          materialCatalog={materialCatalog}
          workerCatalog={workerCatalog}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function WorkReportFormModal({
  report,
  plants,
  workers,
  materials,
  materialCatalog,
  workerCatalog,
  onClose,
  onSaved,
}: {
  report: WorkReport | null;
  plants: Plant[];
  workers: WorkReportWorker[];
  materials: WorkReportMaterial[];
  materialCatalog: WorkReportMaterialCatalogEntry[];
  workerCatalog: WorkReportWorkerCatalogEntry[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [plantId, setPlantId] = useState(report?.plant_id ?? plants[0]?.id ?? '');
  const [reportDate, setReportDate] = useState(report?.report_date ?? new Date().toISOString().slice(0, 10));
  const [teamName, setTeamName] = useState(report?.team_name ?? '');
  const [workDescription, setWorkDescription] = useState(report?.work_description ?? '');
  const [notes, setNotes] = useState(report?.notes ?? '');
  const [workerRows, setWorkerRows] = useState<WorkerDraft[]>(
    workers.length > 0
      ? workers.map((worker) => ({ worker_name: worker.worker_name, hours: String(worker.hours), rate_type: worker.rate_type || 'ORDINARIA', notes: worker.notes ?? '' }))
      : [{ worker_name: '', hours: '', rate_type: 'ORDINARIA', notes: '' }],
  );
  const [materialRows, setMaterialRows] = useState<MaterialDraft[]>(
    materials.map((material) => ({
      description: material.description,
      quantity: String(material.quantity),
      unit: material.unit,
      notes: material.notes ?? '',
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (submit: boolean) => {
    const cleanWorkers: WorkReportWorkerInput[] = workerRows
      .filter((worker) => worker.worker_name.trim() && Number(worker.hours) > 0)
      .map((worker) => ({
        worker_name: worker.worker_name,
        hours: Number(worker.hours),
        rate_type: worker.rate_type || 'ORDINARIA',
        notes: worker.notes || null,
      }));
    const cleanMaterials: WorkReportMaterialInput[] = materialRows
      .filter((material) => material.description.trim() && Number(material.quantity) > 0)
      .map((material) => ({
        item_code: null,
        description: material.description,
        quantity: Number(material.quantity),
        unit: material.unit || 'PZ',
        notes: material.notes || null,
      }));

    if (!plantId) { setError('Seleziona un impianto.'); return; }
    if (!teamName.trim()) { setError('Indica la squadra.'); return; }
    if (cleanWorkers.length === 0) { setError('Inserisci almeno un lavoratore con le ore svolte.'); return; }

    setBusy(true);
    setError(null);
    try {
      let saved: WorkReport;
      if (report) {
        saved = await updateWorkReport(report.id, {
          plant_id: plantId,
          report_date: reportDate,
          team_name: teamName.trim().toUpperCase(),
          work_description: workDescription.trim().toUpperCase() || null,
          notes: notes.trim().toUpperCase() || null,
          status: report.status === 'DA_CORREGGERE' ? 'DA_CORREGGERE' : 'BOZZA',
        });
      } else {
        saved = await createWorkReport({
          plant_id: plantId,
          report_date: reportDate,
          team_name: teamName.trim().toUpperCase(),
          work_description: workDescription.trim().toUpperCase() || null,
          notes: notes.trim().toUpperCase() || null,
          status: 'BOZZA',
        });
      }

      await replaceWorkReportWorkers(saved.id, cleanWorkers);
      await replaceWorkReportMaterials(saved.id, cleanMaterials);

      if (submit) {
        await updateWorkReport(saved.id, {
          status: 'DA_VERIFICARE',
          submitted_at: new Date().toISOString(),
        });
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio rapportino non riuscito.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{report ? 'Modifica rapportino' : 'Nuovo rapportino'}</h2>
            <p className="text-xs text-slate-500">Compila i dati della giornata. I costi economici saranno gestiti solo dall'amministrazione.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Impianto *
            <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className={inputClass + ' mt-1'} required>
              <option value="">Seleziona impianto</option>
              {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.owner_name} — {plant.address}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Data *
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className={inputClass + ' mt-1'} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Squadra *
            <input value={teamName} onChange={(e) => setTeamName(e.target.value.toUpperCase())} className={inputClass + ' mt-1'} placeholder="ES. SQUADRA 1" />
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Lavorazioni eseguite
            <textarea rows={3} value={workDescription} onChange={(e) => setWorkDescription(e.target.value.toUpperCase())} className={inputClass + ' mt-1 resize-none'} placeholder="Descrivi le attività svolte..." />
          </label>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 font-semibold text-slate-900"><Users size={17} /> Manodopera</h3>
            <button
              type="button"
              onClick={() => setWorkerRows((rows) => [...rows, { worker_name: '', hours: '', rate_type: 'ORDINARIA', notes: '' }])}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900"
            >
              <UserRoundPlus size={14} /> Aggiungi
            </button>
          </div>
          <datalist id="work-report-worker-options">
            {workerCatalog.map((worker) => <option key={worker.id} value={worker.worker_name} />)}
          </datalist>
          <div className="space-y-3">
            {workerRows.map((worker, index) => (
              <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1.25fr_0.5fr_0.8fr_1fr_auto]">
                <input
                  list="work-report-worker-options"
                  value={worker.worker_name}
                  onChange={(e) => setWorkerRows((rows) => rows.map((row, i) => i === index ? { ...row, worker_name: e.target.value.toUpperCase() } : row))}
                  className={inputClass}
                  placeholder="Nome lavoratore"
                />
                <input type="number" min="0.25" max="24" step="0.25" value={worker.hours} onChange={(e) => setWorkerRows((rows) => rows.map((row, i) => i === index ? { ...row, hours: e.target.value } : row))} className={inputClass} placeholder="Ore" />
                <select value={worker.rate_type} onChange={(e) => setWorkerRows((rows) => rows.map((row, i) => i === index ? { ...row, rate_type: e.target.value } : row))} className={inputClass}>
                  <option value="ORDINARIA">Ordinaria</option>
                  <option value="STRAORDINARIA">Straordinaria</option>
                  <option value="FESTIVA">Festiva</option>
                  <option value="NOTTURNA">Notturna</option>
                  <option value="ALTRO">Altro</option>
                </select>
                <input value={worker.notes} onChange={(e) => setWorkerRows((rows) => rows.map((row, i) => i === index ? { ...row, notes: e.target.value.toUpperCase() } : row))} className={inputClass} placeholder="Nota opzionale" />
                <button type="button" onClick={() => setWorkerRows((rows) => rows.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 font-semibold text-slate-900"><PackagePlus size={17} /> Materiali utilizzati</h3>
            <button
              type="button"
              onClick={() => setMaterialRows((rows) => [...rows, { description: '', quantity: '1', unit: 'PZ', notes: '' }])}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900"
            >
              <Plus size={14} /> Aggiungi
            </button>
          </div>
          <datalist id="work-report-material-options">
            {materialCatalog.map((material) => <option key={material.id} value={material.description} />)}
          </datalist>
          {materialRows.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Nessun materiale inserito.</p>
          ) : (
            <div className="space-y-3">
              {materialRows.map((material, index) => (
                <div key={index} className="rounded-xl bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-[2fr_0.6fr_0.6fr_auto]">
                    <input
                      list="work-report-material-options"
                      value={material.description}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        const exact = materialCatalog.find((item) => item.normalized_description === value.trim().replace(/\s+/g, ' '));
                        setMaterialRows((rows) => rows.map((row, i) => i === index ? { ...row, description: value, unit: exact?.default_unit ?? row.unit } : row));
                      }}
                      className={inputClass}
                      placeholder="Descrizione materiale"
                    />
                    <input type="number" min="0.001" step="0.001" value={material.quantity} onChange={(e) => setMaterialRows((rows) => rows.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} className={inputClass} placeholder="Q.tà" />
                    <input value={material.unit} onChange={(e) => setMaterialRows((rows) => rows.map((row, i) => i === index ? { ...row, unit: e.target.value.toUpperCase() } : row))} className={inputClass} placeholder="PZ" />
                    <button type="button" onClick={() => setMaterialRows((rows) => rows.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
                  </div>
                  <input value={material.notes} onChange={(e) => setMaterialRows((rows) => rows.map((row, i) => i === index ? { ...row, notes: e.target.value.toUpperCase() } : row))} className={inputClass + ' mt-2'} placeholder="Nota materiale opzionale" />
                </div>
              ))}
            </div>
          )}
        </section>

        <label className="mt-4 block text-xs font-semibold text-slate-600">Note della giornata
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value.toUpperCase())} className={inputClass + ' mt-1 resize-none'} placeholder="Problemi, materiale mancante, attività da completare..." />
        </label>

        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Annulla</button>
          <button type="button" onClick={() => void save(false)} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 disabled:opacity-50">
            <Save size={17} /> Salva bozza
          </button>
          <button type="button" onClick={() => void save(true)} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            Invia in segreteria
          </button>
        </div>
      </div>
    </div>
  );
}
