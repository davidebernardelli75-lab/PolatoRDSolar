import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { CalendarEvent, CalendarEventCategory, CalendarEventInsert } from '@/lib/types';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEventCategories,
  fetchCalendarEvents,
  rememberCalendarCustomCategory,
  updateCalendarEvent,
} from '@/lib/api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100';

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const OTHER_CATEGORY = '__OTHER__';

const ICONS: Record<string, string> = {
  hourglass: '⏳',
  helmet: '🦺',
  solar: '☀️',
  tools: '🔧',
  toolbox: '🧰',
  meeting: '💬',
  delivery: '📦',
  shopping: '🛒',
  phone: '☎️',
  quote: '🧾',
  money: '💶',
  training: '🎓',
  documents: '📁',
  shield: '🛡️',
  'car-service': '🚗',
  van: '🚐',
  admin: '🗂️',
  urgent: '🚨',
  birthday: '🎂',
  heart: '💖',
  party: '🎉',
  reminder: '📌',
  holiday: '🏖️',
  permit: '🎟️',
  sick: '🤒',
  star: '⭐',
};

const COLOR_STYLES: Record<string, { soft: string; text: string; border: string; dot: string; sticker: string }> = {
  red: { soft: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500', sticker: 'bg-red-100 ring-red-200' },
  orange: { soft: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500', sticker: 'bg-orange-100 ring-orange-200' },
  amber: { soft: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-500', sticker: 'bg-amber-100 ring-amber-200' },
  yellow: { soft: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200', dot: 'bg-yellow-400', sticker: 'bg-yellow-100 ring-yellow-200' },
  lime: { soft: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-200', dot: 'bg-lime-500', sticker: 'bg-lime-100 ring-lime-200' },
  green: { soft: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500', sticker: 'bg-green-100 ring-green-200' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500', sticker: 'bg-emerald-100 ring-emerald-200' },
  teal: { soft: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500', sticker: 'bg-teal-100 ring-teal-200' },
  cyan: { soft: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500', sticker: 'bg-cyan-100 ring-cyan-200' },
  sky: { soft: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500', sticker: 'bg-sky-100 ring-sky-200' },
  blue: { soft: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500', sticker: 'bg-blue-100 ring-blue-200' },
  indigo: { soft: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500', sticker: 'bg-indigo-100 ring-indigo-200' },
  violet: { soft: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500', sticker: 'bg-violet-100 ring-violet-200' },
  purple: { soft: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500', sticker: 'bg-purple-100 ring-purple-200' },
  fuchsia: { soft: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500', sticker: 'bg-fuchsia-100 ring-fuchsia-200' },
  pink: { soft: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-200', dot: 'bg-pink-500', sticker: 'bg-pink-100 ring-pink-200' },
  rose: { soft: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500', sticker: 'bg-rose-100 ring-rose-200' },
  slate: { soft: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500', sticker: 'bg-slate-100 ring-slate-200' },
};

function styleFor(colorKey: string) {
  return COLOR_STYLES[colorKey] ?? COLOR_STYLES.slate;
}

function iconFor(iconKey: string) {
  return ICONS[iconKey] ?? ICONS.star;
}

function localIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthTitle(date: Date): string {
  const text = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}

function displayTime(value: string | null, allDay: boolean): string {
  if (allDay) return 'Tutto il giorno';
  if (!value) return 'Ora non indicata';
  return value.slice(0, 5);
}

function startOfCalendarGrid(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayBasedDay = (first.getDay() + 6) % 7;
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() - mondayBasedDay);
}

function makeCalendarDays(month: Date): Date[] {
  const start = startOfCalendarGrid(month);
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}

export function CalendarDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<CalendarEventCategory[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CalendarEvent | 'new' | null>(null);
  const [newDate, setNewDate] = useState(localIsoDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventRows, categoryRows] = await Promise.all([
        fetchCalendarEvents(),
        fetchCalendarEventCategories(),
      ]);
      setEvents(eventRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare il calendario.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('it');
    return events.filter((event) => {
      const category = categoryById.get(event.category_id);
      const categoryHit = categoryFilter === 'ALL' || event.category_id === categoryFilter;
      const textHit = !query || [event.title, event.notes ?? '', category?.label ?? '']
        .some((value) => value.toLocaleLowerCase('it').includes(query));
      return categoryHit && textHit;
    });
  }, [events, categoryById, categoryFilter, search]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const dayEvents = map.get(event.event_date) ?? [];
      dayEvents.push(event);
      map.set(event.event_date, dayEvents);
    });
    map.forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
        return (a.start_time ?? '').localeCompare(b.start_time ?? '');
      });
    });
    return map;
  }, [filteredEvents]);

  const calendarDays = useMemo(() => makeCalendarDays(month), [month]);
  const today = localIsoDate(new Date());

  const monthEvents = filteredEvents.filter((event) => {
    const date = new Date(`${event.event_date}T12:00:00`);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  });

  const openNew = (date = today) => {
    setNewDate(date);
    setEditing('new');
  };

  const remove = async (event: CalendarEvent) => {
    if (!window.confirm(`Eliminare l'evento "${event.title}" del ${displayDate(event.event_date)}?`)) return;
    try {
      await deleteCalendarEvent(event.id);
      setEvents((current) => current.filter((item) => item.id !== event.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione evento non riuscita.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-8">
      <header className="mb-6 rounded-3xl bg-blue-900 p-5 text-white shadow-sm lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">AMMINISTRAZIONE</div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <CalendarDays size={26} /> Calendario
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-blue-100">
              Scadenze, attività, appuntamenti, ricorrenze e promemoria in un'unica agenda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openNew()}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
          >
            <Plus size={18} /> Nuovo evento
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca evento, categoria o nota..."
            className={inputClass + ' pl-9'}
          />
        </label>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="ALL">Tutte le categorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {iconFor(category.icon_key)} {category.label}
            </option>
          ))}
        </select>

        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${viewMode === 'month' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutGrid size={15} /> Mese
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${viewMode === 'list' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <List size={15} /> Elenco
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Mese precedente"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Mese successivo"
            >
              <ChevronRight size={19} />
            </button>
          </div>
          <div className="text-lg font-bold text-blue-950">{monthTitle(month)}</div>
          <div className="text-xs font-semibold text-slate-500">
            {monthEvents.length} event{monthEvents.length === 1 ? 'o' : 'i'}
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto animate-spin text-blue-900" />
          </div>
        ) : viewMode === 'month' ? (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((date) => {
                  const iso = localIsoDate(date);
                  const inMonth = date.getMonth() === month.getMonth();
                  const dayEvents = eventsByDate.get(iso) ?? [];
                  const isToday = iso === today;

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => openNew(iso)}
                      className={`group min-h-[150px] border-b border-r border-slate-100 p-2 text-left align-top transition hover:bg-blue-50/40 ${inMonth ? 'bg-white' : 'bg-slate-50/70'}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-red-500 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                          {date.getDate()}
                        </span>
                        <Plus size={14} className="text-slate-300 opacity-0 transition group-hover:opacity-100" />
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => {
                          const category = categoryById.get(event.category_id);
                          const style = styleFor(category?.color_key ?? 'slate');
                          return (
                            <div
                              key={event.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditing(event);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditing(event);
                                }
                              }}
                              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${style.soft} ${style.text} ${style.border}`}
                            >
                              <span>{iconFor(category?.icon_key ?? 'star')}</span>
                              <span className="min-w-0 flex-1 truncate">{event.title}</span>
                              {!event.all_day && event.start_time && <span className="shrink-0 opacity-70">{event.start_time.slice(0, 5)}</span>}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="px-1 text-[10px] font-semibold text-slate-500">+{dayEvents.length - 3} altri</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <CalendarList
            events={filteredEvents}
            categories={categoryById}
            onEdit={setEditing}
            onDelete={(event) => void remove(event)}
          />
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Legenda eventi</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => {
            const style = styleFor(category.color_key);
            return (
              <div key={category.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${style.soft} ${style.text} ${style.border}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-base ring-1 ${style.sticker}`}>
                  {iconFor(category.icon_key)}
                </span>
                {category.label}
              </div>
            );
          })}
        </div>
      </section>

      {editing && (
        <CalendarEventModal
          event={editing === 'new' ? null : editing}
          initialDate={editing === 'new' ? newDate : editing.event_date}
          categories={categories}
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

function CalendarList({
  events,
  categories,
  onEdit,
  onDelete,
}: {
  events: CalendarEvent[];
  categories: Map<string, CalendarEventCategory>;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  const sorted = [...events].sort((a, b) =>
    a.event_date.localeCompare(b.event_date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''),
  );

  if (sorted.length === 0) {
    return <p className="py-20 text-center text-sm text-slate-400">Nessun evento corrisponde ai filtri.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {sorted.map((event) => {
        const category = categories.get(event.category_id);
        const style = styleFor(category?.color_key ?? 'slate');
        return (
          <div key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ring-2 ring-white ${style.sticker}`}>
              {iconFor(category?.icon_key ?? 'star')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{event.title}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.soft} ${style.text} ${style.border}`}>
                  {category?.label ?? 'Categoria'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{displayDate(event.event_date)}</span>
                <span className="inline-flex items-center gap-1"><Clock3 size={12} />{displayTime(event.start_time, event.all_day)}</span>
                {event.reminder_minutes != null && <span className="inline-flex items-center gap-1"><Bell size={12} />Promemoria {event.reminder_minutes} min prima</span>}
              </div>
              {event.notes && <p className="mt-1 text-xs text-slate-600">{event.notes}</p>}
            </div>
            <button type="button" onClick={() => onEdit(event)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Modifica evento">
              <Pencil size={16} />
            </button>
            <button type="button" onClick={() => onDelete(event)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Elimina evento">
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CalendarEventModal({
  event,
  initialDate,
  categories,
  onClose,
  onSaved,
}: {
  event: CalendarEvent | null;
  initialDate: string;
  categories: CalendarEventCategory[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const initialCategory = event?.category_id ?? categories[0]?.id ?? '';
  const [title, setTitle] = useState(event?.title ?? '');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [customCategory, setCustomCategory] = useState('');
  const [eventDate, setEventDate] = useState(event?.event_date ?? initialDate);
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [startTime, setStartTime] = useState(event?.start_time?.slice(0, 5) ?? '09:00');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [reminderMinutes, setReminderMinutes] = useState(event?.reminder_minutes == null ? '' : String(event.reminder_minutes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!eventDate) {
      setError('Indica la data.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let finalCategoryId = categoryId;
      let finalCategoryLabel = categories.find((category) => category.id === categoryId)?.label ?? '';

      if (categoryId === OTHER_CATEGORY) {
        if (!customCategory.trim()) {
          throw new Error('Scrivi il nome della nuova categoria.');
        }
        const remembered = await rememberCalendarCustomCategory(customCategory.trim());
        finalCategoryId = remembered.id;
        finalCategoryLabel = remembered.label;
      }

      if (!finalCategoryId) throw new Error('Seleziona una categoria.');

      const cleanTitle = title.trim() || finalCategoryLabel;
      if (!cleanTitle) throw new Error('Indica il titolo dell’evento.');

      const input: CalendarEventInsert = {
        category_id: finalCategoryId,
        title: cleanTitle,
        event_date: eventDate,
        start_time: allDay ? null : (startTime || null),
        all_day: allDay,
        notes: notes.trim() || null,
        reminder_minutes: reminderMinutes === '' ? null : Number(reminderMinutes),
      };

      if (event) await updateCalendarEvent(event.id, input);
      else await createCalendarEvent(input);

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio evento non riuscito.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 sm:p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">CALENDARIO</div>
            <h2 className="mt-1 text-lg font-bold text-blue-950">{event ? 'Modifica evento' : 'Nuovo evento'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Chiudi">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-5 rounded-2xl border border-dashed border-blue-200 bg-gradient-to-r from-blue-50 via-white to-amber-50 p-4">
            <p className="text-sm font-semibold text-blue-950">Scegli la categoria e il calendario farà il resto.</p>
            <p className="mt-1 text-xs text-slate-500">Ogni tipo di evento ha il suo colore e la sua icona. “Altro” crea e ricorda automaticamente una nuova categoria.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Categoria *
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass + ' mt-1'}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {iconFor(category.icon_key)} {category.label}
                  </option>
                ))}
                <option value={OTHER_CATEGORY}>⭐ Altro...</option>
              </select>
            </label>

            {categoryId === OTHER_CATEGORY && (
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Nuova categoria *
                <input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className={inputClass + ' mt-1'}
                  placeholder="Es. Cena aziendale, Gara BJJ, Festa, Controllo..."
                  autoFocus
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">
                  Verrà salvata e comparirà automaticamente nel menù per i prossimi eventi.
                </span>
              </label>
            )}

            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Titolo
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass + ' mt-1'}
                placeholder="Se lo lasci vuoto userò il nome della categoria"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Data *
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass + ' mt-1'} />
            </label>

            <div className="text-xs font-semibold text-slate-600">
              Orario
              <div className="mt-1 flex gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={allDay}
                  className={inputClass + ' disabled:bg-slate-100 disabled:text-slate-400'}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-red-500"
              />
              Tutto il giorno
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Promemoria
              <select value={reminderMinutes} onChange={(e) => setReminderMinutes(e.target.value)} className={inputClass + ' mt-1'}>
                <option value="">Nessun promemoria</option>
                <option value="0">All'ora dell'evento</option>
                <option value="15">15 minuti prima</option>
                <option value="30">30 minuti prima</option>
                <option value="60">1 ora prima</option>
                <option value="1440">1 giorno prima</option>
                <option value="2880">2 giorni prima</option>
                <option value="10080">1 settimana prima</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Note
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass + ' mt-1 resize-none'}
                placeholder="Dettagli, contatti, cose da ricordare..."
              />
            </label>
          </div>

          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Annulla
            </button>
            <button type="button" onClick={() => void save()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-50">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <CalendarDays size={17} />}
              {event ? 'Salva modifiche' : 'Aggiungi al calendario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
