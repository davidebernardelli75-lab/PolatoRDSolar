import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  QuoteRequest,
  WorkReport,
  WorkReportLaborRateDefault,
  WorkReportMaterial,
  WorkReportMaterialCatalogEntry,
  WorkReportMaterialCost,
  WorkReportMaterialCostDefault,
  WorkReportMaterialInput,
  WorkReportStatus,
  WorkReportSiteOption,
  WorkSite,
  WorkSiteOption,
  WorkSitePhase,
  WorkReportWorker,
  WorkReportWorkerCatalogEntry,
  WorkReportWorkerCost,
  WorkReportWorkerInput,
} from '@/lib/types';
import {
  createWorkReport,
  createWorkSite,
  deleteWorkReport,
  deleteWorkReportGroup,
  deleteWorkSiteGroup,
  fetchPlants,
  fetchQuoteRequests,
  fetchWorkReportAdminSummary,
  fetchWorkReportLaborRateDefaults,
  fetchWorkReportMaterialCatalog,
  fetchWorkReportMaterialCostDefaults,
  fetchWorkReportMaterialCosts,
  fetchWorkReportMaterials,
  fetchWorkReports,
  fetchWorkReportSiteOptions,
  fetchWorkSiteOptions,
  fetchWorkSitePhases,
  fetchWorkSites,
  fetchWorkReportWorkerCatalog,
  fetchWorkReportWorkerCosts,
  fetchWorkReportWorkers,
  replaceWorkReportMaterials,
  replaceWorkReportWorkers,
  setWorkReportQuoteLink,
  setWorkReportSiteLink,
  setWorkReportMaterialCost,
  setWorkReportMaterialMarkup,
  setWorkReportWorkerCost,
  updateWorkReport,
  updateWorkSite,
  updateWorkSitePhase,
  rememberWorkSiteOption,
} from '@/lib/api';

interface WorkReportDashboardProps {
  isAdmin: boolean;
}

type WorkerDraft = { worker_name: string; hours: string; rate_type: string; notes: string };
type MaterialDraft = { source_id: string | null; description: string; quantity: string; unit: string; notes: string; unit_price: string };

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';
const WORK_REPORT_UNITS = ['PZ', 'MT', 'M²', 'M³', 'KG', 'L', 'ROTOLO', 'BOBINA', 'CONF.', 'SCATOLA', 'KIT', 'COPPIA', 'SET'] as const;

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
  const [materialCostDefaults, setMaterialCostDefaults] = useState<WorkReportMaterialCostDefault[]>([]);
  const [laborRateDefaults, setLaborRateDefaults] = useState<WorkReportLaborRateDefault[]>([]);
  const [materialCostSnapshots, setMaterialCostSnapshots] = useState<WorkReportMaterialCost[]>([]);
  const [workerCostSnapshots, setWorkerCostSnapshots] = useState<WorkReportWorkerCost[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [siteOptions, setSiteOptions] = useState<WorkReportSiteOption[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [sitePhases, setSitePhases] = useState<WorkSitePhase[]>([]);
  const [siteFieldOptions, setSiteFieldOptions] = useState<WorkSiteOption[]>([]);
  const [editingSite, setEditingSite] = useState<WorkSite | 'new' | null>(null);
  const [editing, setEditing] = useState<WorkReport | 'new' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [associationEditingGroupKey, setAssociationEditingGroupKey] = useState<string | null>(null);
  const [associationBusyGroupKey, setAssociationBusyGroupKey] = useState<string | null>(null);
  const [deletingGroupKey, setDeletingGroupKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'TUTTI' | WorkReportStatus>('TUTTI');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRows, workerRows, materialRows, plantRows, materialOptions, workerOptions, siteOptionRows] = await Promise.all([
        fetchWorkReports(),
        fetchWorkReportWorkers(),
        fetchWorkReportMaterials(),
        fetchPlants(),
        fetchWorkReportMaterialCatalog(),
        fetchWorkReportWorkerCatalog(),
        fetchWorkReportSiteOptions(),
      ]);

      let quoteRows: QuoteRequest[] = [];
      let siteRows: WorkSite[] = [];
      let sitePhaseRows: WorkSitePhase[] = [];
      let siteFieldOptionRows: WorkSiteOption[] = [];
      let materialCostDefaultRows: WorkReportMaterialCostDefault[] = [];
      let laborRateDefaultRows: WorkReportLaborRateDefault[] = [];
      let materialCostRows: WorkReportMaterialCost[] = [];
      let workerCostRows: WorkReportWorkerCost[] = [];
      if (isAdmin) {
        [
          quoteRows,
          siteRows,
          sitePhaseRows,
          siteFieldOptionRows,
          materialCostDefaultRows,
          laborRateDefaultRows,
          materialCostRows,
          workerCostRows,
        ] = await Promise.all([
          fetchQuoteRequests(),
          fetchWorkSites(),
          fetchWorkSitePhases(),
          fetchWorkSiteOptions(),
          fetchWorkReportMaterialCostDefaults(),
          fetchWorkReportLaborRateDefaults(),
          fetchWorkReportMaterialCosts(),
          fetchWorkReportWorkerCosts(),
        ]);
      }

      setReports(reportRows);
      setWorkers(workerRows);
      setMaterials(materialRows);
      setPlants(plantRows);
      setMaterialCatalog(materialOptions);
      setWorkerCatalog(workerOptions);
      setQuotes(quoteRows);
      setSiteOptions(siteOptionRows);
      setSites(siteRows);
      setSitePhases(sitePhaseRows);
      setSiteFieldOptions(siteFieldOptionRows);
      setMaterialCostDefaults(materialCostDefaultRows);
      setLaborRateDefaults(laborRateDefaultRows);
      setMaterialCostSnapshots(materialCostRows);
      setWorkerCostSnapshots(workerCostRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i rapportini.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const plantById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);
  const quoteById = useMemo(() => new Map(quotes.map((quote) => [quote.id, quote])), [quotes]);
  const materialCostByRow = useMemo(
    () => new Map(materialCostSnapshots.map((row) => [row.report_material_id, Number(row.unit_price)])),
    [materialCostSnapshots],
  );
  const workerCostByRow = useMemo(
    () => new Map(workerCostSnapshots.map((row) => [row.report_worker_id, Number(row.hourly_rate)])),
    [workerCostSnapshots],
  );
  const materialDefaultByCatalog = useMemo(
    () => new Map(materialCostDefaults.map((row) => [row.material_catalog_id, Number(row.unit_price)])),
    [materialCostDefaults],
  );
  const laborDefaultByKey = useMemo(
    () => new Map(laborRateDefaults.map((row) => [
      `${row.worker_catalog_id}::${normalizeCatalogValue(row.rate_type)}`,
      Number(row.hourly_rate),
    ])),
    [laborRateDefaults],
  );
  const materialCatalogByDescription = useMemo(
    () => new Map(materialCatalog.map((item) => [item.normalized_description, item])),
    [materialCatalog],
  );
  const workerCatalogByName = useMemo(
    () => new Map(workerCatalog.map((item) => [item.normalized_worker_name, item])),
    [workerCatalog],
  );
  const filtered = reports.filter((report) => statusFilter === 'TUTTI' || report.status === statusFilter);

  const adminGroups = useMemo(() => {
    const map = new Map<string, { key: string; quoteRequestId: string | null; reports: WorkReport[] }>();

    filtered.forEach((report) => {
      const quoteRequestId = report.quote_request_id ?? null;
      const key = quoteRequestId ? `QUOTE::${quoteRequestId}` : `UNLINKED::${report.id}`;

      const current = map.get(key);
      if (current) {
        current.reports.push(report);
      } else {
        map.set(key, {
          key,
          quoteRequestId,
          reports: [report],
        });
      }
    });

    return [...map.values()]
      .map((group) => ({
        ...group,
        reports: [...group.reports].sort((a, b) =>
          b.report_date.localeCompare(a.report_date) || b.created_at.localeCompare(a.created_at)),
      }))
      .sort((a, b) => {
        const aDate = a.reports[0]?.report_date ?? '';
        const bDate = b.reports[0]?.report_date ?? '';
        return bDate.localeCompare(aDate);
      });
  }, [filtered]);
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

  const updateGroupQuoteAssociation = async (
    groupKey: string,
    reportIds: string[],
    currentQuoteId: string | null,
    quoteRequestId: string | null,
  ) => {
    if (currentQuoteId === quoteRequestId) {
      setAssociationEditingGroupKey(null);
      return;
    }

    const currentQuote = currentQuoteId ? quoteById.get(currentQuoteId) : null;
    const nextQuote = quoteRequestId ? quoteById.get(quoteRequestId) : null;
    const message = quoteRequestId
      ? `Collegare ${reportIds.length === 1 ? 'questo rapportino' : `questi ${reportIds.length} rapportini`} al cantiere ${nextQuote?.progressive_number ?? ''}/${nextQuote?.series ?? ''} - ${nextQuote?.client ?? ''}?\n\nL'associazione attuale${currentQuote ? ` con il cantiere ${currentQuote.progressive_number}/${currentQuote.series} - ${currentQuote.client}` : ''} verrà sostituita.`
      : `Scollegare ${reportIds.length === 1 ? 'questo rapportino' : `questi ${reportIds.length} rapportini`} dal cantiere? I rapportini resteranno disponibili nella sezione da associare.`;

    if (!window.confirm(message)) return;

    setAssociationBusyGroupKey(groupKey);
    setError(null);
    try {
      await Promise.all(reportIds.map((reportId) => setWorkReportQuoteLink(reportId, quoteRequestId)));
      setAssociationEditingGroupKey(null);
      setExpandedGroupKey(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Correzione dell’associazione al cantiere non riuscita.');
    } finally {
      setAssociationBusyGroupKey(null);
    }
  };

  const remove = async (report: WorkReport) => {
    if (!window.confirm(`Eliminare definitivamente il rapportino del ${displayDate(report.report_date)} relativo a "${report.client_reference}"?\n\nVerranno eliminati anche ore, materiali e costi collegati. Questa operazione non è annullabile.`)) return;
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

  const removeGroup = async (
    groupKey: string,
    quoteRequestId: string | null,
    reportIds: string[],
    label: string,
    totalReportCount: number,
  ) => {
    if (!window.confirm(
      `Eliminare definitivamente il cantiere "${label}"?\n\nVerranno eliminati tutti i ${totalReportCount} rapportini del cantiere con ore, materiali e costi collegati. Il preventivo resterà nel registro preventivi. Questa operazione non è annullabile.`,
    )) return;

    setDeletingGroupKey(groupKey);
    setError(null);
    try {
      await deleteWorkReportGroup(quoteRequestId, reportIds);
      setExpandedGroupKey(null);
      setAssociationEditingGroupKey(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione cantiere non riuscita.');
    } finally {
      setDeletingGroupKey(null);
    }
  };

  const renderReportCard = (report: WorkReport, nested = false) => {
    const plant = report.plant_id ? plantById.get(report.plant_id) : undefined;
    const reportWorkers = workers.filter((worker) => worker.report_id === report.id);
    const reportMaterials = materials.filter((material) => material.report_id === report.id);
    const hours = reportWorkers.reduce((sum, worker) => sum + Number(worker.hours || 0), 0);
    const expanded = expandedId === report.id;
    const editable = true;
    const deletable = true;

    return (
      <article
        key={report.id}
        className={nested
          ? 'rounded-xl border border-slate-200 bg-white p-3'
          : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="rounded-xl bg-blue-50 px-3 py-2 text-center text-blue-900">
            <div className="text-[10px] font-semibold uppercase">Data</div>
            <div className="text-sm font-bold">{displayDate(report.report_date)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {!nested && <h3 className="font-semibold text-slate-900">{report.client_reference}</h3>}
              {nested && <h4 className="font-semibold text-slate-900">{report.client_reference}</h4>}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(report.status)}`}>
                {report.status.replace(/_/g, ' ')}
              </span>
            </div>
            {!nested && (
              <p className="mt-0.5 text-xs text-slate-500">
                {plant ? `Impianto FV: ${plant.owner_name} · ${plant.address}` : 'Rapportino libero · nessun impianto FV collegato'}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {!nested && <span className="inline-flex items-center gap-1"><Users size={13} />{report.team_name}</span>}
              <span className="inline-flex items-center gap-1"><Clock3 size={13} />{hours.toLocaleString('it-IT')} ore</span>
              <span className="inline-flex items-center gap-1"><PackagePlus size={13} />{reportMaterials.length} materiali</span>
            </div>
            {report.work_description && <p className="mt-2 text-sm text-slate-700">{report.work_description}</p>}
            {report.notes && <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">NOTE: {report.notes}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1">
            {isAdmin && !expanded && (
              <button
                onClick={() => setExpandedId(report.id)}
                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Prezzi e costi
              </button>
            )}
            {editable && (
              <button
                onClick={() => setEditing(report)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label={isAdmin ? 'Correggi dati o cantiere del rapportino' : 'Modifica rapportino'}
                title={isAdmin ? 'Correggi dati o cantiere del rapportino' : 'Modifica rapportino'}
              >
                <Pencil size={17} />
              </button>
            )}
            {deletable && (
              <button
                onClick={() => void remove(report)}
                disabled={busyId === report.id}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                aria-label="Elimina rapportino"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button
              onClick={() => setExpandedId(expanded ? null : report.id)}
              className="rounded-lg p-2 text-blue-900 hover:bg-blue-50"
              aria-label="Dettagli rapportino"
            >
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
                      <span>{worker.worker_name}<span className="ml-1 text-[10px] text-slate-400">({worker.rate_type || 'ORDINARIA'})</span></span>
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
            reportId={report.id}
            workers={reportWorkers}
            materials={reportMaterials}
            allReports={reports}
            allWorkers={workers}
            allMaterials={materials}
            workerCatalog={workerCatalog}
            materialCatalog={materialCatalog}
            quoteOptions={quotes}
            linkedQuoteRequestId={report.quote_request_id}
            onCostsSaved={load}
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
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 lg:p-8">
      <header className="mb-6 rounded-2xl bg-blue-900 p-5 text-white lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-[10px] font-semibold tracking-widest text-red-300">
              {isAdmin ? 'AMMINISTRAZIONE' : 'SQUADRA FV'}
            </div>
            <h1 className="text-2xl font-bold">{isAdmin ? 'Cantieri' : 'Rapportini di lavoro'}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {isAdmin
                ? 'Cantieri, rapportini collegati e analisi economica progressiva di manodopera e materiali.'
                : 'Ore di manodopera, attività svolte e materiali utilizzati per ogni cantiere o intervento.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <button
                onClick={() => setEditingSite('new')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-950 hover:bg-blue-50"
              >
                <Plus size={18} /> Nuovo cantiere
              </button>
            )}
            <button
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              <Plus size={18} /> Nuovo rapportino
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mr-2 inline" />{error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <Kpi label="Cantieri" value={String(sites.length)} />
            <Kpi label="Da iniziare" value={String(sites.filter((site) => normalizeCatalogValue(site.site_status) === 'DA INIZIARE').length)} />
            <Kpi label="In corso" value={String(sites.filter((site) => normalizeCatalogValue(site.site_status) === 'IN CORSO').length)} />
            <Kpi label="Rapportini" value={String(reports.length)} />
          </>
        ) : (
          <>
            <Kpi label="Rapportini" value={String(reports.length)} />
            <Kpi label="Da verificare" value={String(pendingCount)} />
            <Kpi label="Approvati" value={String(approvedCount)} />
            <Kpi label="Ore registrate" value={totalHours.toLocaleString('it-IT', { maximumFractionDigits: 2 })} />
          </>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-blue-900" />
          <h2 className="font-semibold text-slate-900">{isAdmin ? 'Registro cantieri e rapportini da associare' : 'I miei rapportini'}</h2>
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
      ) : !isAdmin && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <ClipboardList size={34} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">Nessun rapportino disponibile.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {isAdmin ? (
            <WorkSiteRegister
              sites={sites}
              phases={sitePhases}
              siteOptions={siteFieldOptions}
              reports={reports}
              visibleReports={filtered}
              workers={workers}
              materials={materials}
              quotes={quotes}
              workerCatalog={workerCatalog}
              materialCatalog={materialCatalog}
              workerCostByRow={workerCostByRow}
              materialCostByRow={materialCostByRow}
              laborDefaultByKey={laborDefaultByKey}
              materialDefaultByCatalog={materialDefaultByCatalog}
              workerCatalogByName={workerCatalogByName}
              materialCatalogByDescription={materialCatalogByDescription}
              renderReportCard={(report) => renderReportCard(report, true)}
              onEditSite={(site) => setEditingSite(site)}
              onReload={load}
              onError={setError}
            />
          ) : filtered.map((report) => renderReportCard(report))}
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
          quoteOptions={quotes}
          siteOptions={siteOptions}
          isAdmin={isAdmin}
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

function normalizeCatalogValue(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

function AdminReportCostEditor({
  reportId,
  workers,
  materials,
  allReports,
  allWorkers,
  allMaterials,
  workerCatalog,
  materialCatalog,
  quoteOptions,
  linkedQuoteRequestId,
  onCostsSaved,
}: {
  reportId: string;
  workers: WorkReportWorker[];
  materials: WorkReportMaterial[];
  allReports: WorkReport[];
  allWorkers: WorkReportWorker[];
  allMaterials: WorkReportMaterial[];
  workerCatalog: WorkReportWorkerCatalogEntry[];
  materialCatalog: WorkReportMaterialCatalogEntry[];
  quoteOptions: QuoteRequest[];
  linkedQuoteRequestId: string | null;
  onCostsSaved: () => Promise<void>;
}) {
  const [workerRates, setWorkerRates] = useState<Record<string, string>>({});
  const [materialPrices, setMaterialPrices] = useState<Record<string, string>>({});
  const [materialMarkupPercent, setMaterialMarkupPercent] = useState('0');
  const [otherPlantLaborCost, setOtherPlantLaborCost] = useState(0);
  const [otherPlantMaterialCost, setOtherPlantMaterialCost] = useState(0);
  const [otherPlantMissingCosts, setOtherPlantMissingCosts] = useState(0);
  const [loadingCosts, setLoadingCosts] = useState(true);
  const [savingCosts, setSavingCosts] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCosts = async () => {
      setLoadingCosts(true);
      setCostError(null);
      try {
        const [materialDefaults, laborDefaults, materialSnapshots, workerSnapshots, adminSummary] = await Promise.all([
          fetchWorkReportMaterialCostDefaults(),
          fetchWorkReportLaborRateDefaults(),
          fetchWorkReportMaterialCosts(),
          fetchWorkReportWorkerCosts(),
          fetchWorkReportAdminSummary(reportId),
        ]);
        if (!active) return;

        const materialSnapshotByRow = new Map(materialSnapshots.map((row) => [row.report_material_id, Number(row.unit_price)]));
        const workerSnapshotByRow = new Map(workerSnapshots.map((row) => [row.report_worker_id, Number(row.hourly_rate)]));
        const materialDefaultByCatalog = new Map(materialDefaults.map((row) => [row.material_catalog_id, Number(row.unit_price)]));
        const laborDefaultByKey = new Map(laborDefaults.map((row) => [`${row.worker_catalog_id}::${normalizeCatalogValue(row.rate_type)}`, Number(row.hourly_rate)]));

        const nextMaterialPrices: Record<string, string> = {};
        materials.forEach((material) => {
          const snapshot = materialSnapshotByRow.get(material.id);
          if (snapshot != null) {
            nextMaterialPrices[material.id] = String(snapshot);
            return;
          }
          const catalog = materialCatalog.find((item) => item.normalized_description === normalizeCatalogValue(material.description));
          const fallback = catalog ? materialDefaultByCatalog.get(catalog.id) : undefined;
          nextMaterialPrices[material.id] = fallback != null ? String(fallback) : '';
        });

        const nextWorkerRates: Record<string, string> = {};
        workers.forEach((worker) => {
          const snapshot = workerSnapshotByRow.get(worker.id);
          if (snapshot != null) {
            nextWorkerRates[worker.id] = String(snapshot);
            return;
          }
          const catalog = workerCatalog.find((item) => item.normalized_worker_name === normalizeCatalogValue(worker.worker_name));
          const key = catalog ? `${catalog.id}::${normalizeCatalogValue(worker.rate_type || 'ORDINARIA')}` : '';
          const fallback = key ? laborDefaultByKey.get(key) : undefined;
          nextWorkerRates[worker.id] = fallback != null ? String(fallback) : '';
        });

        setMaterialPrices(nextMaterialPrices);
        setWorkerRates(nextWorkerRates);
        setMaterialMarkupPercent(String(adminSummary?.material_markup_percent ?? 0));

        const otherReportIds = new Set(
          allReports
            .filter((report) => linkedQuoteRequestId
              ? report.quote_request_id === linkedQuoteRequestId && report.id !== reportId
              : false)
            .map((report) => report.id),
        );

        let historicalLaborCost = 0;
        let historicalMaterialCost = 0;
        let missingHistoricalCosts = 0;

        allWorkers.forEach((worker) => {
          if (!otherReportIds.has(worker.report_id)) return;

          let rate = workerSnapshotByRow.get(worker.id);
          if (rate == null) {
            const workerCatalogEntry = workerCatalog.find(
              (item) => item.normalized_worker_name === normalizeCatalogValue(worker.worker_name),
            );
            const laborDefaultKey = workerCatalogEntry
              ? `${workerCatalogEntry.id}::${normalizeCatalogValue(worker.rate_type || 'ORDINARIA')}`
              : '';
            rate = laborDefaultKey ? laborDefaultByKey.get(laborDefaultKey) : undefined;
          }

          if (rate == null) {
            missingHistoricalCosts += 1;
            return;
          }

          historicalLaborCost += Number(worker.hours) * rate;
        });

        allMaterials.forEach((material) => {
          if (!otherReportIds.has(material.report_id)) return;

          let unitPrice = materialSnapshotByRow.get(material.id);
          if (unitPrice == null) {
            const materialCatalogEntry = materialCatalog.find(
              (item) => item.normalized_description === normalizeCatalogValue(material.description),
            );
            unitPrice = materialCatalogEntry
              ? materialDefaultByCatalog.get(materialCatalogEntry.id)
              : undefined;
          }

          if (unitPrice == null) {
            missingHistoricalCosts += 1;
            return;
          }

          historicalMaterialCost += Number(material.quantity) * unitPrice;
        });

        setOtherPlantLaborCost(historicalLaborCost);
        setOtherPlantMaterialCost(historicalMaterialCost);
        setOtherPlantMissingCosts(missingHistoricalCosts);
      } catch (err) {
        if (active) setCostError(err instanceof Error ? err.message : 'Impossibile caricare i costi amministrativi.');
      } finally {
        if (active) setLoadingCosts(false);
      }
    };
    void loadCosts();
    return () => { active = false; };
  }, [reportId, linkedQuoteRequestId, materials, workers, allReports, allWorkers, allMaterials, materialCatalog, workerCatalog]);

  const laborTotal = workers.reduce((sum, worker) => {
    const rate = Number(workerRates[worker.id]);
    return sum + (Number.isFinite(rate) ? Number(worker.hours) * rate : 0);
  }, 0);
  const materialsTotal = materials.reduce((sum, material) => {
    const price = Number(materialPrices[material.id]);
    return sum + (Number.isFinite(price) ? Number(material.quantity) * price : 0);
  }, 0);
  const markupPercent = Number(materialMarkupPercent);
  const safeMarkupPercent = Number.isFinite(markupPercent) ? markupPercent : 0;
  const markedMaterialsTotal = materialsTotal * (1 + safeMarkupPercent / 100);

  const currentMissingCosts =
    workers.filter((worker) => workerRates[worker.id] === '' || !Number.isFinite(Number(workerRates[worker.id]))).length
    + materials.filter((material) => materialPrices[material.id] === '' || !Number.isFinite(Number(materialPrices[material.id]))).length;
  const totalMissingCosts = otherPlantMissingCosts + currentMissingCosts;
  const jobLaborCost = otherPlantLaborCost + laborTotal;
  const jobMaterialCost = otherPlantMaterialCost + materialsTotal;
  const jobCostToDate = jobLaborCost + jobMaterialCost;
  const selectedQuote = quoteOptions.find((quote) => quote.id === linkedQuoteRequestId) ?? null;
  const quoteValue = selectedQuote?.value_ex_vat == null ? null : Number(selectedQuote.value_ex_vat);
  const jobResult = quoteValue == null ? null : quoteValue - jobCostToDate;
  const jobMarginPercent = quoteValue != null && quoteValue > 0 && jobResult != null
    ? (jobResult / quoteValue) * 100
    : null;
  const economicClass = jobMarginPercent == null
    ? 'bg-slate-100 text-slate-600'
    : jobMarginPercent > 0.005
      ? 'bg-green-100 text-green-800'
      : jobMarginPercent < -0.005
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800';
  const economicLabel = jobMarginPercent == null
    ? 'N/D'
    : jobMarginPercent > 0.005
      ? `GUADAGNO +${jobMarginPercent.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`
      : jobMarginPercent < -0.005
        ? `PERDITA ${jobMarginPercent.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`
        : 'PARI 0%';

  const saveCosts = async () => {
    setSavingCosts(true);
    setCostError(null);
    setSaved(false);
    try {
      if (safeMarkupPercent < -100 || safeMarkupPercent > 1000) {
        throw new Error('La percentuale di ricarico deve essere compresa tra -100% e 1000%.');
      }
      await Promise.all([
        setWorkReportMaterialMarkup(reportId, safeMarkupPercent),
        ...workers
          .filter((worker) => workerRates[worker.id] !== '' && Number(workerRates[worker.id]) >= 0)
          .map((worker) => setWorkReportWorkerCost(worker.id, Number(workerRates[worker.id]))),
        ...materials
          .filter((material) => materialPrices[material.id] !== '' && Number(materialPrices[material.id]) >= 0)
          .map((material) => setWorkReportMaterialCost(material.id, Number(materialPrices[material.id]))),
      ]);
      setSaved(true);
      await onCostsSaved();
    } catch (err) {
      setCostError(err instanceof Error ? err.message : 'Salvataggio costi non riuscito.');
    } finally {
      setSavingCosts(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="mb-3">
        <h4 className="font-semibold text-emerald-950">Valorizzazione amministrativa</h4>
        <p className="text-xs text-emerald-800">
          Prezzi e tariffe sono visibili solo in amministrazione. Dopo il primo inserimento vengono riproposti automaticamente nei rapportini successivi.
        </p>
      </div>

      {loadingCosts ? (
        <div className="py-5 text-center"><Loader2 className="mx-auto animate-spin text-emerald-700" /></div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h5 className="text-sm font-bold uppercase tracking-wide text-blue-950">Andamento cantiere vs preventivo</h5>
                <p className="mt-0.5 text-[11px] text-blue-800">
                  Il confronto usa tutti i rapportini registrati nello stesso cantiere. L'abbinamento si corregge dalla maschera principale del cantiere.
                </p>
              </div>
              <div className={`rounded-full px-3 py-2 text-xs font-bold ${economicClass}`}>
                {economicLabel}
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">Valore preventivo</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {quoteValue == null ? '—' : quoteValue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">Costo sostenuto finora</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {jobCostToDate.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  Manodopera {jobLaborCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} · Materiali {jobMaterialCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">Risultato attuale</div>
                <div className={`mt-1 text-sm font-bold ${jobResult == null ? 'text-slate-500' : jobResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {jobResult == null ? '—' : jobResult.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">Margine attuale</div>
                <div className={`mt-1 text-sm font-bold ${jobMarginPercent == null ? 'text-slate-500' : jobMarginPercent > 0.005 ? 'text-green-700' : jobMarginPercent < -0.005 ? 'text-red-700' : 'text-amber-700'}`}>
                  {jobMarginPercent == null ? '—' : `${jobMarginPercent.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`}
                </div>
              </div>
            </div>

            {selectedQuote && selectedQuote.status !== 'ACCETTATO' && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Il preventivo collegato è in stato {selectedQuote.status}. Il confronto è disponibile, ma il valore potrebbe non essere ancora definitivo.
              </p>
            )}
            {totalMissingCosts > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Andamento parziale: {totalMissingCosts} voce/i di costo nei rapportini dell'impianto non sono ancora valorizzate.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-3">
              <h5 className="text-sm font-bold uppercase tracking-wide text-slate-800">Squadra</h5>
              <p className="mt-0.5 text-[11px] text-slate-500">Valorizza il costo orario di ogni componente della squadra.</p>
            </div>

            {workers.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">Nessun componente della squadra registrato.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[780px] space-y-2">
                  <div className="grid grid-cols-[2fr_0.65fr_1fr_1fr_1fr] gap-2 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <span>Dipendente</span>
                    <span>Ore</span>
                    <span>Tipo ore</span>
                    <span>Costo orario €/h</span>
                    <span className="text-right">Totale</span>
                  </div>
                  {workers.map((worker) => {
                    const rate = workerRates[worker.id] ?? '';
                    const lineTotal = rate === '' ? null : Number(worker.hours) * Number(rate);
                    return (
                      <div key={worker.id} className="grid grid-cols-[2fr_0.65fr_1fr_1fr_1fr] items-center gap-2 rounded-xl bg-slate-50 p-2">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">{worker.worker_name}</div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">{Number(worker.hours).toLocaleString('it-IT')} h</div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600">{worker.rate_type || 'ORDINARIA'}</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rate}
                          onChange={(e) => setWorkerRates((current) => ({ ...current, [worker.id]: e.target.value }))}
                          className={inputClass}
                          placeholder="€/h"
                          aria-label={`Costo orario di ${worker.worker_name}`}
                        />
                        <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-right text-sm font-bold text-emerald-900">
                          {lineTotal == null || !Number.isFinite(lineTotal) ? '—' : lineTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h5 className="text-sm font-bold uppercase tracking-wide text-slate-800">Materiale</h5>
                <p className="mt-0.5 text-[11px] text-slate-500">Costo aziendale, ricarico e valore ricaricato vengono calcolati riga per riga.</p>
              </div>
              <label className="text-[11px] font-semibold text-slate-600">
                Ricarico %
                <input
                  type="number"
                  min="-100"
                  max="1000"
                  step="0.01"
                  value={materialMarkupPercent}
                  onChange={(e) => setMaterialMarkupPercent(e.target.value)}
                  className="ml-2 w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  aria-label="Percentuale di ricarico materiale"
                />
              </label>
            </div>

            {materials.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">Nessun materiale registrato.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1120px] space-y-2">
                  <div className="grid grid-cols-[2.2fr_0.6fr_0.55fr_1fr_1fr_1fr_1fr] gap-2 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <span>Materiale</span>
                    <span>Quantità</span>
                    <span>U.M.</span>
                    <span>Costo unitario €</span>
                    <span>Prezzo rincarato €</span>
                    <span className="text-right">Totale costo</span>
                    <span className="text-right">Totale rincarato</span>
                  </div>
                  {materials.map((material) => {
                    const price = materialPrices[material.id] ?? '';
                    const numericPrice = Number(price);
                    const lineTotal = price === '' || !Number.isFinite(numericPrice) ? null : Number(material.quantity) * numericPrice;
                    const markedUnitPrice = price === '' || !Number.isFinite(numericPrice) ? null : numericPrice * (1 + safeMarkupPercent / 100);
                    const markedLineTotal = markedUnitPrice == null ? null : Number(material.quantity) * markedUnitPrice;
                    return (
                      <div key={material.id} className="grid grid-cols-[2.2fr_0.6fr_0.55fr_1fr_1fr_1fr_1fr] items-center gap-2 rounded-xl bg-slate-50 p-2">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">{material.description}</div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">{Number(material.quantity).toLocaleString('it-IT')}</div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">{material.unit}</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) => setMaterialPrices((current) => ({ ...current, [material.id]: e.target.value }))}
                          className={inputClass}
                          placeholder="€/unità"
                          aria-label={`Costo unitario di ${material.description}`}
                        />
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
                          {markedUnitPrice == null ? '—' : markedUnitPrice.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <div className="rounded-lg bg-slate-100 px-3 py-2.5 text-right text-sm font-bold text-slate-800">
                          {lineTotal == null ? '—' : lineTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-right text-sm font-bold text-emerald-900">
                          {markedLineTotal == null ? '—' : markedLineTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {materials.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-end gap-2 text-xs">
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                  Totale costo materiale <strong>{materialsTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</strong>
                </span>
                <span className="rounded-lg bg-emerald-100 px-3 py-2 text-emerald-900">
                  Totale materiale rincarato <strong>{markedMaterialsTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</strong>
                </span>
              </div>
            )}
          </section>
        </div>
      )}

      {!loadingCosts && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200 pt-4">
          <div className="text-sm text-slate-700">
            Manodopera <strong>{laborTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</strong>
            <span className="mx-2 text-slate-300">·</span>
            Materiale a costo <strong>{materialsTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</strong>
            <span className="mx-2 text-slate-300">·</span>
            Costo sostenuto <strong>{(laborTotal + materialsTotal).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</strong>
            <span className="mx-2 text-slate-300">·</span>
            Materiale rincarato <strong className="text-emerald-900">{markedMaterialsTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</strong>
          </div>
          <button
            type="button"
            onClick={() => void saveCosts()}
            disabled={savingCosts}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {savingCosts ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salva costi
          </button>
        </div>
      )}
      {saved && <p className="mt-2 text-xs font-semibold text-emerald-700">Costi salvati e impostati come valori predefiniti per i prossimi rapportini.</p>}
      {costError && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{costError}</p>}
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
  quoteOptions,
  siteOptions,
  isAdmin,
  onClose,
  onSaved,
}: {
  report: WorkReport | null;
  plants: Plant[];
  workers: WorkReportWorker[];
  materials: WorkReportMaterial[];
  materialCatalog: WorkReportMaterialCatalogEntry[];
  workerCatalog: WorkReportWorkerCatalogEntry[];
  quoteOptions: QuoteRequest[];
  siteOptions: WorkReportSiteOption[];
  isAdmin: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [plantId, setPlantId] = useState(report?.plant_id ?? '');
  const [clientReference, setClientReference] = useState(report?.client_reference ?? '');
  const [quoteRequestId, setQuoteRequestId] = useState(report?.quote_request_id ?? '');
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
      source_id: material.id,
      description: material.description,
      quantity: String(material.quantity),
      unit: material.unit,
      notes: material.notes ?? '',
      unit_price: '',
    })),
  );
  const [materialDefaultPrices, setMaterialDefaultPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    const loadMaterialPrices = async () => {
      try {
        const [defaults, snapshots] = await Promise.all([
          fetchWorkReportMaterialCostDefaults(),
          fetchWorkReportMaterialCosts(),
        ]);
        if (!active) return;

        const defaultByCatalogId = new Map(defaults.map((row) => [row.material_catalog_id, String(row.unit_price)]));
        const defaultsByDescription: Record<string, string> = {};
        materialCatalog.forEach((item) => {
          const price = defaultByCatalogId.get(item.id);
          if (price != null) defaultsByDescription[item.normalized_description] = price;
        });
        setMaterialDefaultPrices(defaultsByDescription);

        const snapshotByMaterialId = new Map(snapshots.map((row) => [row.report_material_id, String(row.unit_price)]));
        setMaterialRows((rows) => rows.map((row) => {
          if (row.unit_price) return row;
          const snapshot = row.source_id ? snapshotByMaterialId.get(row.source_id) : undefined;
          const fallback = defaultsByDescription[normalizeCatalogValue(row.description)];
          return { ...row, unit_price: snapshot ?? fallback ?? '' };
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossibile caricare i prezzi dei materiali.');
      }
    };

    void loadMaterialPrices();
    return () => { active = false; };
  }, [isAdmin, materialCatalog]);

  const save = async (submit: boolean) => {
    const cleanWorkers: WorkReportWorkerInput[] = workerRows
      .filter((worker) => worker.worker_name.trim() && Number(worker.hours) > 0)
      .map((worker) => ({
        worker_name: worker.worker_name,
        hours: Number(worker.hours),
        rate_type: worker.rate_type || 'ORDINARIA',
        notes: worker.notes || null,
      }));
    const cleanMaterialRows = materialRows
      .filter((material) => material.description.trim() && Number(material.quantity) > 0);
    const cleanMaterials: WorkReportMaterialInput[] = cleanMaterialRows
      .map((material) => ({
        item_code: null,
        description: material.description,
        quantity: Number(material.quantity),
        unit: material.unit || 'PZ',
        notes: material.notes || null,
      }));

    if (!clientReference.trim()) { setError('Indica il cliente o il riferimento del cantiere.'); return; }
    if (!teamName.trim()) { setError('Indica la squadra.'); return; }
    if (cleanWorkers.length === 0) { setError('Inserisci almeno un lavoratore con le ore svolte.'); return; }

    setBusy(true);
    setError(null);
    try {
      let saved: WorkReport;
      if (report) {
        saved = await updateWorkReport(report.id, {
          plant_id: plantId || null,
          client_reference: clientReference.trim().toUpperCase(),
          quote_request_id: quoteRequestId || null,
          report_date: reportDate,
          team_name: teamName.trim().toUpperCase(),
          work_description: workDescription.trim().toUpperCase() || null,
          notes: notes.trim().toUpperCase() || null,
          status: isAdmin
            ? report.status
            : (report.status === 'APPROVATO' ? 'DA_VERIFICARE' : (report.status === 'DA_CORREGGERE' ? 'DA_CORREGGERE' : 'BOZZA')),
          submitted_at: !isAdmin && report.status === 'APPROVATO' ? new Date().toISOString() : report.submitted_at,
        });
      } else {
        saved = await createWorkReport({
          plant_id: plantId || null,
          client_reference: clientReference.trim().toUpperCase(),
          quote_request_id: quoteRequestId || null,
          report_date: reportDate,
          team_name: teamName.trim().toUpperCase(),
          work_description: workDescription.trim().toUpperCase() || null,
          notes: notes.trim().toUpperCase() || null,
          status: isAdmin ? 'DA_VERIFICARE' : 'BOZZA',
        });
      }

      await replaceWorkReportWorkers(saved.id, cleanWorkers);
      const savedMaterials = await replaceWorkReportMaterials(saved.id, cleanMaterials);

      if (isAdmin) {
        await Promise.all(savedMaterials.map((material, index) => {
          const value = cleanMaterialRows[index]?.unit_price ?? '';
          if (value === '' || Number(value) < 0) return Promise.resolve();
          return setWorkReportMaterialCost(material.id, Number(value));
        }));
      }

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
            <p className="text-xs text-slate-500">
              Compila i dati della giornata. Puoi collegare il rapportino a un cantiere già esistente; se non è ancora presente, lascialo da associare e l'amministrazione potrà abbinarlo successivamente.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Cliente / riferimento cantiere *
            <input
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value.toUpperCase())}
              className={inputClass + ' mt-1'}
              placeholder="ES. ROSSI MARIO - VIA ROMA 25 - RIFACIMENTO QUADRO"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Impianto FV collegato (facoltativo)
            <select
              value={plantId}
              onChange={(e) => {
                const nextPlantId = e.target.value;
                setPlantId(nextPlantId);
                if (!clientReference.trim() && nextPlantId) {
                  const selectedPlant = plants.find((plant) => plant.id === nextPlantId);
                  if (selectedPlant) {
                    setClientReference(`${selectedPlant.owner_name} - ${selectedPlant.address}`.toUpperCase());
                  }
                }
              }}
              className={inputClass + ' mt-1'}
            >
              <option value="">Nessun impianto FV / intervento libero</option>
              {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.owner_name} — {plant.address}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Cantiere collegato (facoltativo)
            <select
              value={quoteRequestId}
              onChange={(e) => {
                const nextId = e.target.value;
                setQuoteRequestId(nextId);
                if (!clientReference.trim() && nextId) {
                  const selectedReference = isAdmin
                    ? quoteOptions.find((quote) => quote.id === nextId)?.client
                    : siteOptions.find((site) => site.quote_request_id === nextId)?.site_reference;
                  if (selectedReference) setClientReference(selectedReference.toUpperCase());
                }
              }}
              className={inputClass + ' mt-1'}
            >
              <option value="">Nessun cantiere / da associare</option>
              {isAdmin
                ? quoteOptions.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.progressive_number}/{quote.series} · {quote.client} · {quote.status}
                    </option>
                  ))
                : siteOptions.map((site) => (
                    <option key={site.quote_request_id} value={site.quote_request_id}>
                      {site.progressive_number}/{site.series} · {site.site_reference} · {site.report_count} rapp.
                    </option>
                  ))}
            </select>
            {!isAdmin && siteOptions.length === 0 && (
              <span className="mt-1 block text-[10px] font-normal text-slate-400">
                Nessun cantiere già aperto disponibile: lascia il rapportino da associare.
              </span>
            )}
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
            <div>
              <h3 className="inline-flex items-center gap-2 font-semibold text-slate-900"><PackagePlus size={17} /> Materiali utilizzati</h3>
              {isAdmin && <p className="mt-0.5 text-[11px] text-slate-500">In amministrazione puoi valorizzare direttamente il prezzo unitario; i valori già noti si auto-compilano.</p>}
            </div>
            <button
              type="button"
              onClick={() => setMaterialRows((rows) => [...rows, { source_id: null, description: '', quantity: '1', unit: 'PZ', notes: '', unit_price: '' }])}
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
                  <div className={`grid gap-2 ${isAdmin ? 'sm:grid-cols-[1.7fr_0.55fr_0.55fr_0.75fr_auto]' : 'sm:grid-cols-[2fr_0.6fr_0.6fr_auto]'}`}>
                    <input
                      list="work-report-material-options"
                      value={material.description}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        const normalized = normalizeCatalogValue(value);
                        const exact = materialCatalog.find((item) => item.normalized_description === normalized);
                        const defaultPrice = materialDefaultPrices[normalized];
                        setMaterialRows((rows) => rows.map((row, i) => i === index ? {
                          ...row,
                          description: value,
                          unit: exact?.default_unit ?? row.unit,
                          unit_price: isAdmin && defaultPrice != null ? defaultPrice : row.unit_price,
                        } : row));
                      }}
                      className={inputClass}
                      placeholder="Descrizione materiale"
                    />
                    <input type="number" min="0.001" step="0.001" value={material.quantity} onChange={(e) => setMaterialRows((rows) => rows.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} className={inputClass} placeholder="Q.tà" />
                    <select
                      value={material.unit}
                      onChange={(e) => setMaterialRows((rows) => rows.map((row, i) => i === index ? { ...row, unit: e.target.value } : row))}
                      className={inputClass}
                      aria-label="Unità di misura materiale"
                    >
                      {!WORK_REPORT_UNITS.includes(material.unit as typeof WORK_REPORT_UNITS[number]) && material.unit && (
                        <option value={material.unit}>{material.unit}</option>
                      )}
                      {WORK_REPORT_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                    {isAdmin && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={material.unit_price}
                        onChange={(e) => setMaterialRows((rows) => rows.map((row, i) => i === index ? { ...row, unit_price: e.target.value } : row))}
                        className={inputClass}
                        placeholder="Prezzo unit. €"
                        aria-label="Prezzo unitario materiale"
                      />
                    )}
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
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {isAdmin ? 'Salva rapportino' : (report?.status === 'APPROVATO' ? 'Salva e reinvia' : 'Salva bozza')}
          </button>
          {!isAdmin && (
            <button type="button" onClick={() => void save(true)} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              Invia in segreteria
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
