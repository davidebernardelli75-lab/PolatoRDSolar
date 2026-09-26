import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ChevronDown, GraduationCap, Loader2, Pencil, Plus, Search, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { TRAINING_COURSE_GROUPS, TRAINING_COURSE_TITLES } from '@/lib/training-course-catalog';
import {
  addEmployeeCourse, createCustomCourse, createEmployee, fetchCustomCourses,
  fetchEmployeeCourses, fetchEmployees, removeEmployeeCourse,
  updateEmployee, updateEmployeeCourse,
  type Employee, type EmployeeCourse, type EmployeeCourseUpdate, type EmployeeInput,
} from '@/lib/training-api';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';
const euroFreeDate = (date: string | null) => date ? date.split('-').reverse().join('/') : 'Non indicata';
const dayString = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
const expiry = (row: EmployeeCourse): 'expired' | 'soon' | 'ok' | 'untracked' => {
  if (!row.expires_on) return 'untracked';
  if (row.expires_on < dayString()) return 'expired';
  const due = new Date(row.expires_on + 'T12:00:00').getTime();
  return due <= Date.now() + 60 * 86400000 ? 'soon' : 'ok';
};

export function TrainingDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<EmployeeCourse[]>([]);
  const [customCourses, setCustomCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [people, enrollments, custom] = await Promise.all([
        fetchEmployees(), fetchEmployeeCourses(), fetchCustomCourses(),
      ]);
      setEmployees(people);
      setRecords(enrollments);
      setCustomCourses(custom);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare la formazione.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const handleSaveEmployee = async (input: EmployeeInput) => {
    if (editing && editing !== 'new') {
      const saved = await updateEmployee(editing.id, input);
      setEmployees((prev) => prev.map((p) => p.id === saved.id ? saved : p));
    } else {
      const saved = await createEmployee(input);
      setEmployees((prev) => [...prev, saved].sort((a, b) =>
        (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name, 'it')));
      setExpandedId(saved.id);
    }
    setEditing(null);
  };

  const handleToggleCourse = async (employeeId: string, title: string) => {
    setError(null);
    const existing = records.find((r) => r.employee_id === employeeId && r.course_name === title);
    try {
      if (existing) {
        // Keep completed training history: don't silently delete a recorded certificate.
        if (existing.completed_on) {
          throw new Error('Il corso risulta completato. Per conservare lo storico, rimuovi prima la data di completamento.');
        }
        await removeEmployeeCourse(existing.id);
        setRecords((prev) => prev.filter((r) => r.id !== existing.id));
      } else {
        const saved = await addEmployeeCourse(employeeId, title);
        setRecords((prev) => [...prev, saved]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Non è stato possibile aggiornare il corso.';
      setError(message);
      throw err;
    }
  };

  const handleCustomCourse = async (employeeId: string, title: string) => {
    const normalized = title.trim();
    if (!normalized) return;
    const isKnown = [...TRAINING_COURSE_TITLES, ...customCourses].some((c) => c.toLowerCase() === normalized.toLowerCase());
    if (isKnown) {
      await handleToggleCourse(employeeId, normalized);
      return;
    }
    try {
      const saved = await createCustomCourse(normalized);
      setCustomCourses((prev) => [...prev, saved].sort((a, b) => a.localeCompare(b, 'it')));
      await handleToggleCourse(employeeId, saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile creare la voce personalizzata.');
      throw err;
    }
  };

  const handleSaveRecord = async (id: string, input: EmployeeCourseUpdate) => {
    const saved = await updateEmployeeCourse(id, input);
    setRecords((prev) => prev.map((r) => r.id === id ? saved : r));
  };

  const dueSoon = records.filter((r) => expiry(r) === 'soon').length;
  const expired = records.filter((r) => expiry(r) === 'expired').length;
  const filtered = employees.filter((p) =>
    (p.first_name + ' ' + p.last_name + ' ' + (p.job_title ?? '')).toLocaleLowerCase('it')
      .includes(search.toLocaleLowerCase('it')));

  return (
    <div className="mx-auto max-w-5xl p-4 pb-24 lg:p-8">
      <header className="mb-6 rounded-2xl bg-blue-900 p-5 text-white lg:p-6">
        <div className="flex items-center gap-3">
          <GraduationCap size={30} className="text-red-300" />
          <div>
            <div className="mb-1 text-[10px] font-semibold tracking-widest text-red-300">PERSONALE</div>
            <h1 className="text-2xl font-bold">Formazione e corsi</h1>
            <p className="text-sm text-slate-300">Anagrafiche, corsi assegnati e scadenze degli attestati.</p>
          </div>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ['Dipendenti', employees.filter((p) => p.active).length, Users],
          ['Corsi assegnati', records.length, GraduationCap],
          ['In scadenza (60 gg)', dueSoon, CalendarDays],
          ['Scaduti', expired, AlertTriangle],
        ] as const).map(([label, count, Icon]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
            <Icon size={17} className="mb-2 text-blue-900" />
            <div className="text-2xl font-bold text-slate-900">{count}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error} <button className="ml-2 underline" onClick={() => { void load(); }}>Riprova</button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative min-w-[190px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input aria-label="Cerca dipendenti" className={inputClass + ' pl-9'} value={search}
            onChange={(e) => setSearch(e.target.value)} placeholder="Cerca dipendente o mansione" />
        </label>
        <button onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          <Plus size={16} /> Aggiungi dipendente
        </button>
      </div>
      {loading ? (
        <div className="py-16 text-center"><Loader2 size={26} className="mx-auto animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {employees.length ? 'Nessun dipendente corrisponde alla ricerca.' : 'Non ci sono ancora dipendenti. Aggiungi la prima anagrafica.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((person) => (
            <EmployeeCard key={person.id} person={person}
              selected={records.filter((r) => r.employee_id === person.id)}
              customCourses={customCourses}
              expanded={expandedId === person.id}
              onExpand={() => setExpandedId((id) => id === person.id ? null : person.id)}
              onEdit={() => setEditing(person)}
              onToggle={(course) => handleToggleCourse(person.id, course)}
              onCustom={(course) => handleCustomCourse(person.id, course)}
              onSaveRecord={handleSaveRecord}
            />
          ))}
        </div>
      )}
      {editing && (
        <EmployeeFormModal person={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onSave={handleSaveEmployee} />
      )}
      <p className="mt-5 text-xs text-slate-500">
        I corsi disponibili sono orientativi: l'effettivo obbligo formativo dipende da mansione,
        DVR, incarichi e condizioni di lavoro. Scadenze e qualifiche vanno verificate sugli attestati.
      </p>
    </div>
  );
}

function EmployeeCard({
  person, selected, customCourses, expanded, onExpand, onEdit, onToggle, onCustom, onSaveRecord,
}: {
  person: Employee;
  selected: EmployeeCourse[];
  customCourses: string[];
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onToggle: (title: string) => Promise<void>;
  onCustom: (title: string) => Promise<void>;
  onSaveRecord: (id: string, input: EmployeeCourseUpdate) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [courseQuery, setCourseQuery] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [pending, setPending] = useState(false);
  const names = selected.map((r) => r.course_name);
  const nameSet = new Set(names);
  const groups = [
    ...TRAINING_COURSE_GROUPS,
    { label: 'Personalizzati', courses: customCourses },
  ];

  const change = async (name: string) => {
    setPending(true);
    try { await onToggle(name); } catch { /* parent shows the message */ }
    finally { setPending(false); }
  };
  const addCustom = async () => {
    const candidate = customTitle.trim();
    if (!candidate) return;
    setPending(true);
    try { await onCustom(candidate); setCustomTitle(''); }
    catch { /* parent shows the message */ }
    finally { setPending(false); }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-900"><UserRound size={22} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{person.first_name} {person.last_name}</h2>
            {!person.active && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Non attivo</span>}
          </div>
          <p className="text-sm text-slate-500">{person.job_title || 'Mansione non indicata'}</p>
        </div>
        <button aria-label={'Modifica ' + person.first_name + ' ' + person.last_name} onClick={onEdit}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
        <button aria-label="Espandi corsi dipendente" onClick={onExpand}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronDown size={19} className={expanded ? 'rotate-180' : ''} /></button>
      </div>
      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold text-slate-600">Corsi assegnati</p>
        <div className="relative">
          <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((s) => !s)}
            className={inputClass + ' flex items-center justify-between gap-2 text-left'} disabled={pending}>
            <span className="max-h-16 flex-1 overflow-y-auto break-words text-slate-800">
              {names.length ? names.join(' + ') : 'Seleziona uno o più corsi'}
            </span>
            <ChevronDown size={16} className="shrink-0 text-slate-500" />
          </button>
          {menuOpen && (
            <div className="relative z-10 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <input autoFocus aria-label="Filtra corsi" value={courseQuery} onChange={(e) => setCourseQuery(e.target.value)}
                className={inputClass + ' mb-2'} placeholder="Cerca fra i corsi..." />
              {groups.map((group) => {
                const found = group.courses.filter((title) =>
                  title.toLocaleLowerCase('it').includes(courseQuery.toLocaleLowerCase('it')));
                if (!found.length) return null;
                return (
                  <div key={group.label} className="mb-2">
                    <h3 className="sticky top-0 bg-slate-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{group.label}</h3>
                    {found.map((title) => (
                      <button type="button" key={title} disabled={pending} onClick={() => { void change(title); }}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-800 hover:bg-blue-50">
                        <span className={'flex h-4 w-4 shrink-0 items-center justify-center rounded border ' +
                          (nameSet.has(title) ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300')}>
                          {nameSet.has(title) && <Check size={12} />}
                        </span>
                        {title}
                      </button>
                    ))}
                  </div>
                );
              })}
              <div className="border-t border-slate-200 pt-3">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Corso personalizzato</label>
                <div className="flex gap-2">
                  <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} maxLength={160}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCustom(); } }}
                    placeholder="Nome del corso..." className={inputClass} />
                  <button type="button" disabled={pending || !customTitle.trim()}
                    onClick={() => { void addCustom(); }}
                    className="shrink-0 rounded-lg bg-blue-900 px-3 text-xs font-semibold text-white disabled:opacity-50">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)}
                className="mt-2 w-full rounded-md bg-slate-100 py-2 text-xs text-slate-700">Chiudi elenco</button>
            </div>
          )}
        </div>
      </div>
      {selected.some((r) => ['expired', 'soon'].includes(expiry(r))) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.filter((r) => expiry(r) !== 'ok' && expiry(r) !== 'untracked').map((r) => (
            <span key={r.id} className={'rounded-full px-2 py-1 text-[11px] ' +
              (expiry(r) === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
              {r.course_name}: {expiry(r) === 'expired' ? 'scaduto' : 'in scadenza'}
            </span>
          ))}
        </div>
      )}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {person.hired_on && <p className="text-xs text-slate-500">Assunzione: {euroFreeDate(person.hired_on)}</p>}
          {!selected.length && <p className="text-sm text-slate-500">Seleziona un corso per inserire date e attestato.</p>}
          {selected.map((record) => <CourseRecord key={record.id} record={record} onSave={onSaveRecord} />)}
        </div>
      )}
    </article>
  );
}

function CourseRecord({ record, onSave }: {
  record: EmployeeCourse;
  onSave: (id: string, input: EmployeeCourseUpdate) => Promise<void>;
}) {
  const [completedOn, setCompletedOn] = useState(record.completed_on ?? '');
  const [expiresOn, setExpiresOn] = useState(record.expires_on ?? '');
  const [provider, setProvider] = useState(record.provider ?? '');
  const [notes, setNotes] = useState(record.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const state = expiry(record);
  const save = async () => {
    setFeedback(null);
    if (completedOn && expiresOn && expiresOn < completedOn) {
      setFeedback('La scadenza non può precedere la data di completamento.');
      return;
    }
    setBusy(true);
    try {
      await onSave(record.id, {
        completed_on: completedOn || null, expires_on: expiresOn || null,
        provider: provider.trim() || null, notes: notes.trim() || null,
      });
      setFeedback('Salvato');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ShieldCheck size={15} className="text-blue-900" />
        <h4 className="flex-1 text-sm font-semibold text-slate-800">{record.course_name}</h4>
        {state === 'expired' && <span className="text-xs text-red-600">Scaduto</span>}
        {state === 'soon' && <span className="text-xs text-amber-700">In scadenza</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">Data completamento
          <input type="date" className={inputClass + ' mt-1'} value={completedOn}
            onChange={(e) => setCompletedOn(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-slate-600">Scadenza / rinnovo
          <input type="date" className={inputClass + ' mt-1'} value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-slate-600">Ente formatore
          <input className={inputClass + ' mt-1'} value={provider}
            onChange={(e) => setProvider(e.target.value)} placeholder="Ente o società" />
        </label>
        <label className="text-xs font-medium text-slate-600">Note / riferimento attestato
          <input className={inputClass + ' mt-1'} value={notes}
            onChange={(e) => setNotes(e.target.value)} placeholder="Numero attestato, note..." />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span role="status" className="text-xs text-slate-500">{feedback}</span>
        <button disabled={busy} type="button" onClick={() => { void save(); }}
          className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? 'Salvataggio...' : 'Salva corso'}
        </button>
      </div>
    </div>
  );
}

function EmployeeFormModal({ person, onClose, onSave }: {
  person: Employee | null;
  onClose: () => void;
  onSave: (input: EmployeeInput) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(person?.first_name ?? '');
  const [lastName, setLastName] = useState(person?.last_name ?? '');
  const [jobTitle, setJobTitle] = useState(person?.job_title ?? '');
  const [hiredOn, setHiredOn] = useState(person?.hired_on ?? '');
  const [active, setActive] = useState(person?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        first_name: firstName.trim(), last_name: lastName.trim(),
        job_title: jobTitle.trim() || null, hired_on: hiredOn || null, active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare il dipendente.');
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => { void save(e); }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{person ? 'Modifica dipendente' : 'Nuovo dipendente'}</h2>
          <button type="button" aria-label="Chiudi anagrafica" onClick={onClose} className="rounded-lg p-1 text-slate-500"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">Nome
            <input required maxLength={100} className={inputClass + ' mt-1'} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Cognome
            <input required maxLength={100} className={inputClass + ' mt-1'} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Mansione / ruolo
            <input maxLength={160} className={inputClass + ' mt-1'} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Elettricista, installatore FV, responsabile..." />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Data assunzione (facoltativa)
            <input type="date" className={inputClass + ' mt-1'} value={hiredOn} onChange={(e) => setHiredOn(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Dipendente attivo
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy || !firstName.trim() || !lastName.trim()} type="submit"
          className="mt-4 w-full rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Salvataggio...' : 'Salva dipendente'}
        </button>
      </form>
    </div>
  );
}
