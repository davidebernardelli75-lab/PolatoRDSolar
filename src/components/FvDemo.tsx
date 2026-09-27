import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, LockKeyhole, PanelsTopLeft, ShieldAlert } from 'lucide-react';

export function FvDemo({ onExit }: { onExit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b-4 border-red-500 bg-blue-900 px-4 py-5 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/assets/images/Polato_R&D.png" alt="Polato R&D" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
            <div><h1 className="text-lg font-bold">Impianti fotovoltaici</h1><p className="text-xs text-blue-100">Anteprima personale operativo</p></div>
          </div>
          <button type="button" onClick={onExit} className="inline-flex items-center gap-2 rounded-lg border border-blue-400 px-3 py-2 text-sm hover:bg-blue-800">
            <ArrowLeft size={16} />Esci dalla demo
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-6 p-4 py-7 md:p-8">
        <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 shrink-0" size={21} />
          <div><strong>Ambiente dimostrativo – nessun dato reale</strong>
          <p className="mt-1">Questa anteprima non ha accesso a Supabase e non permette di creare, modificare o cancellare gli impianti aziendali. L'accesso reale sarà attivato dopo la creazione della casella FV e la verifica dei permessi.</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5"><PanelsTopLeft size={23} className="text-blue-900" /><p className="mt-2 text-sm text-slate-500">Impianti di esempio</p><p className="text-2xl font-bold">2</p></div>
          <div className="rounded-xl border bg-white p-5"><ClipboardList size={23} className="text-amber-600" /><p className="mt-2 text-sm text-slate-500">Attività di esempio</p><p className="text-2xl font-bold">1</p></div>
          <div className="rounded-xl border bg-white p-5"><CheckCircle2 size={23} className="text-green-700" /><p className="mt-2 text-sm text-slate-500">Completati di esempio</p><p className="text-2xl font-bold">1</p></div>
        </div>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-blue-900">Elenco impianti · dati illustrativi</h2>
          <article className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-bold">Impianto dimostrativo · Valeggio sul Mincio</h3>
                <p className="mt-1 text-sm text-slate-600">5,8 kW · 14 pannelli · documentazione in compilazione</p></div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Esempio da completare</span>
            </div>
            <button type="button" onClick={() => setExpanded(v => !v)} className="mt-4 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white">
              {expanded ? 'Chiudi esempio' : 'Visualizza esempio scheda'}
            </button>
            {expanded && <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Moduli:</strong> 14 · <strong>Inverter:</strong> modello dimostrativo</p>
              <p><strong>Attività:</strong> documentare numeri di serie e foto dei pannelli</p>
              <p className="text-amber-800">Qui saranno disponibili scanner, foto, dati dell'impianto e checklist della vera dashboard FV una volta attivato l'account operativo.</p>
            </div>}
          </article>
          <article className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-bold">Impianto dimostrativo · Peschiera del Garda</h3>
                <p className="mt-1 text-sm text-slate-600">7,2 kW · 18 pannelli · documentazione completa</p></div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Esempio completo</span>
            </div>
          </article>
        </section>
        <p className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole size={14} />Accesso amministrativo, assicurazioni e dipendenti non disponibili in questa demo.</p>
      </div>
    </main>
  );
}
