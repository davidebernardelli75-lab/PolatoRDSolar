import { useState, useEffect } from 'react';
import { Sun, LayoutGrid, LogOut, X, KeyRound, Eye, EyeOff, Car, AlertTriangle, ShieldCheck, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { View } from '@/App';
import { fetchVehicles } from '@/lib/api';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  currentView: View;
  onSignOut: () => void;
}

export function Sidebar({ open, onClose, onNavigate, currentView, onSignOut }: SidebarProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [vehicleAlerts, setVehicleAlerts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      try {
        const vehicles = await fetchVehicles();
        if (cancelled) return;
        const count = vehicles.filter((v) => {
          const insDays = v.insurance_expiry ? Math.round((new Date(v.insurance_expiry).getTime() - Date.now()) / 86400000) : null;
          const inspDays = v.inspection_expiry ? Math.round((new Date(v.inspection_expiry).getTime() - Date.now()) / 86400000) : null;
          const taxDays = v.tax_expiry ? Math.round((new Date(v.tax_expiry).getTime() - Date.now()) / 86400000) : null;
          const gasDays = v.gas_cylinders_inspection_expiry ? Math.round((new Date(v.gas_cylinders_inspection_expiry).getTime() - Date.now()) / 86400000) : null;
          const methaneDays = v.methane_inspection_expiry ? Math.round((new Date(v.methane_inspection_expiry).getTime() - Date.now()) / 86400000) : null;
          const kmUntil = v.service_interval_km - (v.mileage_km - v.last_service_km);
          return (insDays !== null && insDays <= 30) || (inspDays !== null && inspDays <= 30) || (taxDays !== null && taxDays <= 30) || (gasDays !== null && gasDays <= 30) || (methaneDays !== null && methaneDays <= 30) || kmUntil <= 2000;
        }).length;
        setVehicleAlerts(count);
      } catch {
        // skip
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const items = [
    { id: 'dashboard' as const, label: 'Impianti FV', icon: LayoutGrid },
    { id: 'vehicles' as const, label: 'Parco Automezzi', icon: Car, badge: vehicleAlerts },
    { id: 'insurances' as const, label: 'Assicurazioni', icon: ShieldCheck },
    { id: 'training' as const, label: 'Formazione personale', icon: GraduationCap },
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
              (item.id === 'vehicles' && currentView.name === 'vehicles') ||
              (item.id === 'insurances' && currentView.name === 'insurances') ||
              (item.id === 'training' && currentView.name === 'training');
            const badge = 'badge' in item && item.badge ? item.badge : 0;
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
                {badge > 0 && (
                  <span className={`ml-auto flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    <AlertTriangle size={10} />
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-blue-800">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-800 hover:text-white"
          >
            <KeyRound size={16} />Cambia password
          </button>
          <button onClick={onSignOut} className="mb-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-800 hover:text-white">
            <LogOut size={16} />Esci
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sun size={14} className="text-red-400" />
            <span>Gestione impianti solari</span>
          </div>
        </div>
      </aside>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('La nuova password deve avere almeno 8 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nuova password deve essere diversa da quella attuale.');
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
      password: currentPassword,
    });
    if (signInError) {
      setError('La password attuale non e\' corretta.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError('Impossibile aggiornare la password. Riprova piu\' tardi.');
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <KeyRound size={28} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Password aggiornata</h3>
            <p className="mt-2 text-sm text-slate-600">La tua password e\' stata cambiata con successo. Usa la nuova password al prossimo accesso.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-lg bg-blue-900 px-4 py-3 font-semibold text-white transition hover:bg-blue-800">Chiudi</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2 text-blue-900">
            <KeyRound size={20} />
            <h3 className="font-semibold">Cambia password</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Chiudi">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <label className="block text-sm font-medium text-slate-700">Password attuale
            <div className="relative mt-1.5">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <button type="button" onClick={() => setShowCurrent((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600" tabIndex={-1}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="block text-sm font-medium text-slate-700">Nuova password
            <div className="relative mt-1.5">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <button type="button" onClick={() => setShowNew((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600" tabIndex={-1}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Minimo 8 caratteri</p>
          </label>
          <label className="block text-sm font-medium text-slate-700">Conferma nuova password
            <div className="relative mt-1.5">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <button type="button" onClick={() => setShowConfirm((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600" tabIndex={-1}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-70">
            {loading ? 'Aggiornamento…' : 'Aggiorna password'}
          </button>
        </form>
      </div>
    </div>
  );
}
