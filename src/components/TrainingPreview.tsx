import { AlertTriangle, CalendarClock, CheckCircle2, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { TRAINING_COURSE_GROUPS, TRAINING_COURSE_TITLES } from '@/lib/training-course-catalog';

export function TrainingPreview() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-20 lg:p-8">
      <header className="rounded-2xl bg-blue-900 p-5 text-white">
        <div className="flex items-center gap-3"><GraduationCap size={30} className="text-red-300"/>
          <div><h1 className="text-2xl font-bold">Formazione personale</h1>
            <p className="text-sm text-blue-100">Anteprima del nuovo gestionale dipendenti e attestati</p></div>
        </div>
      </header>
      <div role="status" className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="shrink-0" size={22}/>
        <div><strong>Modalità dimostrativa — dati inventati, nessun salvataggio.</strong>
          <p className="mt-1">La dashboard reale è implementata. Per inserire dipendenti e attestati effettivi occorre prima applicare, nel progetto Supabase originale, le migrazioni amministrative e verificarne i permessi.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { name: 'Dipendenti esempio', count: 2, icon: Users },
          { name: 'Corsi esempio', count: 3, icon: GraduationCap },
          { name: 'In scadenza (esempio)', count: 1, icon: CalendarClock },
          { name: 'Catalogo disponibile', count: TRAINING_COURSE_TITLES.length, icon: ShieldCheck },
        ].map(({name,count,icon:Icon})=>
          <div key={name} className="rounded-xl border bg-white p-4"><Icon size={20} className="text-blue-900"/>
            <p className="mt-2 text-2xl font-bold">{count}</p><p className="text-xs text-slate-500">{name}</p>
          </div>
        )}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-blue-900">Esempio di anagrafiche</h2>
        <article className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold text-slate-900">Mario Esempio <span className="ml-2 text-xs font-normal text-slate-400">(nome inventato)</span></h3>
          <p className="mt-1 text-sm text-slate-600">Installatore elettrico e fotovoltaico</p>
          <p className="mt-3 text-sm"><strong>Corsi:</strong> Sicurezza generale + lavori elettrici CEI 11-27 PES/PAV</p>
          <p className="mt-2 text-sm text-amber-800">Attestato di esempio da aggiornare · in scadenza</p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold text-slate-900">Laura Esempio <span className="ml-2 text-xs font-normal text-slate-400">(nome inventato)</span></h3>
          <p className="mt-1 text-sm text-slate-600">Amministrazione e organizzazione</p>
          <p className="mt-3 text-sm"><strong>Corsi:</strong> Formazione generale dei lavoratori</p>
          <p className="mt-2 flex items-center gap-1 text-sm text-green-700"><CheckCircle2 size={16}/>Completato (esempio)</p>
        </article>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-bold text-blue-900">Catalogo formativo già previsto</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {TRAINING_COURSE_GROUPS.map(group=>
            <div key={group.label} className="rounded-lg bg-slate-50 p-3">
              <h3 className="mb-2 text-sm font-semibold">{group.label}</h3>
              <p className="text-xs text-slate-600">{group.courses.slice(0,3).join(' · ')}{group.courses.length>3?' …':''}</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">Le qualifiche e le scadenze effettive dipendono dagli attestati, dalla mansione e dal DVR. Non vengono assegnate automaticamente.</p>
      </section>
    </main>
  );
}
