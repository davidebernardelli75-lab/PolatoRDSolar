import {
  Car,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  LayoutGrid,
  ShieldCheck,
} from 'lucide-react';
import type { View } from '@/App';

interface ModuleLauncherProps {
  isAdmin: boolean;
  onNavigate: (view: View) => void;
}

export function ModuleLauncher({ isAdmin, onNavigate }: ModuleLauncherProps) {
  const items = [
    {
      id: 'dashboard' as const,
      label: 'Impianti FV',
      description: 'Anagrafica impianti, componenti, scadenze e attività operative.',
      icon: LayoutGrid,
    },
    {
      id: 'reports' as const,
      label: 'Rapportini',
      description: 'Rapportini di lavoro, squadre, materiali e andamento delle commesse.',
      icon: ClipboardList,
    },
    ...(isAdmin ? [
      {
        id: 'vehicles' as const,
        label: 'Parco Automezzi',
        description: 'Veicoli, costi di gestione, tagliandi, revisioni e scadenze.',
        icon: Car,
      },
      {
        id: 'insurances' as const,
        label: 'Assicurazioni',
        description: 'Polizze, categorie, premi, coperture e scadenze.',
        icon: ShieldCheck,
      },
      {
        id: 'training' as const,
        label: 'Formazione personale',
        description: 'Dipendenti, corsi, abilitazioni e formazione tecnica.',
        icon: GraduationCap,
      },
      {
        id: 'quotes' as const,
        label: 'Preventivi',
        description: 'Richieste, sopralluoghi, valori, allegati e stato dei preventivi.',
        icon: FileSpreadsheet,
      },
    ] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 lg:p-8">
      <header className="mb-6 rounded-3xl bg-blue-900 p-6 text-white lg:p-8">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">
          {isAdmin ? 'AMMINISTRAZIONE' : 'SQUADRA FV'}
        </div>
        <h1 className="mt-2 text-2xl font-bold lg:text-3xl">Scegli la sezione</h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          Seleziona la sezione da aprire. Dopo il primo accesso puoi spostarti tra le aree dal menu laterale.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate({ name: item.id } as View)}
              className="group min-h-[210px] rounded-3xl border-2 border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-900 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-300"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-900 text-white transition group-hover:bg-red-500">
                <Icon size={38} />
              </span>
              <h2 className="mt-5 text-xl font-bold text-blue-950">{item.label}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
