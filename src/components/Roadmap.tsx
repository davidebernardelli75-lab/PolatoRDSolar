import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  Loader2,
  FileCheck,
  Wrench,
  ListChecks,
} from 'lucide-react';
import type { RoadmapTask, RoadmapCategory } from '@/lib/types';
import { fetchRoadmapTasks, toggleRoadmapTask } from '@/lib/api';

interface RoadmapProps {
  plantId: string;
}

export function Roadmap({ plantId }: RoadmapProps) {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openCat, setOpenCat] = useState<RoadmapCategory | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchRoadmapTasks(plantId);
      setTasks(data);
    } catch {
      // skip
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    load();
  }, [load]);

  const burocracia = tasks.filter((t) => t.category === 'Burocrazia');
  const funzionale = tasks.filter((t) => t.category === 'Funzionale');
  const totalDone = tasks.filter((t) => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  const catPct = (cat: RoadmapCategory) => {
    const catTasks = tasks.filter((t) => t.category === cat);
    if (catTasks.length === 0) return 0;
    return Math.round((catTasks.filter((t) => t.completed).length / catTasks.length) * 100);
  };

  const handleToggle = async (taskId: string, current: boolean) => {
    const next = !current;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: next, completed_at: next ? new Date().toISOString() : null }
          : t
      )
    );
    try {
      await toggleRoadmapTask(taskId, next);
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, completed: current, completed_at: current ? t.completed_at : null }
            : t
        )
      );
    }
  };

  const progressColor = getProgressColor(pct);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header — clickable to expand/collapse */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-900 rounded-lg">
            <ListChecks className="text-white" size={20} />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-slate-900 text-sm">SyncroSolar — Roadmap</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Avanzamento progetto: {totalDone}/{tasks.length} task completati
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-sm font-bold tabular-nums ${progressColor.text}`}>
              {pct}%
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expandable content */}
      {open && (
        <div className="border-t border-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Nessuna task roadmap trovata per questo impianto.
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <RoadmapCategorySection
                title="Burocrazia"
                icon={FileCheck}
                tasks={burocracia}
                pct={catPct('Burocrazia')}
                isOpen={openCat === 'Burocrazia'}
                onToggleOpen={() => setOpenCat(openCat === 'Burocrazia' ? null : 'Burocrazia')}
                onToggleTask={handleToggle}
              />
              <RoadmapCategorySection
                title="Funzionale"
                icon={Wrench}
                tasks={funzionale}
                pct={catPct('Funzionale')}
                isOpen={openCat === 'Funzionale'}
                onToggleOpen={() => setOpenCat(openCat === 'Funzionale' ? null : 'Funzionale')}
                onToggleTask={handleToggle}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoadmapCategorySection({
  title,
  icon: Icon,
  tasks,
  pct,
  isOpen,
  onToggleOpen,
  onToggleTask,
}: {
  title: string;
  icon: typeof FileCheck;
  tasks: RoadmapTask[];
  pct: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleTask: (taskId: string, current: boolean) => void;
}) {
  const color = getProgressColor(pct);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Category header */}
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={18} className="text-blue-900" />
          <span className="font-medium text-slate-800 text-sm">{title}</span>
          <span className="text-xs text-slate-400">
            ({tasks.filter((t) => t.completed).length}/{tasks.length})
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums ${color.text}`}>{pct}%</span>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Task list */}
      {isOpen && (
        <div className="divide-y divide-slate-50">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onToggleTask(task.id, task.completed)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              {task.completed ? (
                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
              ) : (
                <Circle size={20} className="text-slate-300 flex-shrink-0" />
              )}
              <span
                className={`text-sm flex-1 ${
                  task.completed
                    ? 'text-slate-400 line-through'
                    : 'text-slate-700'
                }`}
              >
                {task.label}
              </span>
              {task.completed && task.completed_at && (
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {new Date(task.completed_at).toLocaleDateString('it-IT')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function getProgressColor(pct: number): { bar: string; text: string; bg: string; border: string } {
  if (pct < 34) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    };
  }
  if (pct < 67) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    };
  }
  if (pct < 100) {
    return {
      bar: 'bg-green-500',
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    };
  }
  return {
    bar: 'bg-blue-500',
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  };
}
