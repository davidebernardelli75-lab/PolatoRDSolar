import { Sun, LayoutGrid, PlusCircle, LogOut, X } from 'lucide-react';
import type { View } from '@/App';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  currentView: View;
  onSignOut: () => void;
}

export function Sidebar({ open, onClose, onNavigate, currentView, onSignOut }: SidebarProps) {
  const items = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutGrid },
    { id: 'new-plant' as const, label: 'Nuovo Impianto', icon: PlusCircle },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/Polato_R&D.png"
              alt="Polato R&D"
              className="h-10 w-10 object-contain rounded-lg bg-white p-1"
            />
            <div>
              <div className="font-bold text-sm leading-tight">Polato R&D</div>
              <div className="text-[10px] text-red-400 tracking-widest uppercase">
                Solar Archive
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-blue-800"
            aria-label="Chiudi menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              (item.id === 'dashboard' && currentView.name === 'dashboard') ||
              (item.id === 'new-plant' && currentView.name === 'new-plant');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate({ name: item.id } as View)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-red-500 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-blue-800">
          <button onClick={onSignOut} className="mb-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-800 hover:text-white">
            <LogOut size={16} />Esci
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sun size={14} className="text-red-400" />
            <span>Gestione impianti solari</span>
          </div>
        </div>
      </aside>
    </>
  );
}
