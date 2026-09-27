import { useState, type FormEvent } from 'react';
import { Building2, HardHat, LockKeyhole, Mail, Eye, EyeOff, ArrowLeft, ShieldCheck, MonitorPlay } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginProps { onFvDemo: () => void; }
type Portal = 'admin' | 'fv';

export function Login({ onFvDemo }: LoginProps) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = (choice: Portal) => {
    setPortal(choice);
    setEmail(choice === 'admin' ? 'amministrazione@polatord.it' : 'impiantiFV@polatord.it');
    setPassword('');
    setMessage(null); setError(null);
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError(null); setMessage(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (authError) setError('Accesso non riuscito. Verifica email e password.');
    } catch {
      setError('Impossibile collegarsi al servizio. Riprova.');
    } finally { setBusy(false); }
  };

  const recover = async () => {
    if (!email.trim()) { setError('Inserisci l’indirizzo email da recuperare.'); return; }
    setRecovering(true); setError(null); setMessage(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + '/?auth=recovery',
      });
      if (resetError) setError(resetError.status === 429 ? 'Troppe richieste. Attendi prima di riprovare.' : 'Recupero non riuscito. Riprova più tardi.');
      else setMessage('Se l’indirizzo è registrato, riceverai un’email con il link per impostare una nuova password. Controlla anche lo spam.');
    } catch { setError('Impossibile contattare il servizio di recupero.'); }
    finally { setRecovering(false); }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <header className="border-b-4 border-red-500 bg-blue-900 px-6 py-8 text-center text-white">
          <img src="/assets/images/Polato_R&D.png" alt="Polato R&D" className="mx-auto mb-4 h-20 w-36 rounded-xl bg-white object-contain p-2" />
          <h1 className="text-2xl font-bold tracking-tight">Polato R&D Solar Archive</h1>
          <p className="mt-2 text-sm text-blue-100">Scegli l'area a cui desideri accedere</p>
        </header>

        {!portal ? (
          <div className="grid gap-4 p-6 md:grid-cols-2 md:gap-6 md:p-10">
            <button type="button" onClick={() => select('admin')}
              className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-left transition hover:border-blue-900 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-400">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900 text-white"><Building2 size={32} /></span>
              <h2 className="text-xl font-bold text-blue-900">Amministrazione</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Impianti FV, automezzi, assicurazioni e formazione del personale.</p>
              <span className="mt-6 inline-flex items-center rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white group-hover:bg-blue-800">Accedi all'area</span>
            </button>
            <button type="button" onClick={() => select('fv')}
              className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-left transition hover:border-red-500 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-red-400">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 text-white"><HardHat size={32} /></span>
              <h2 className="text-xl font-bold text-blue-900">Impianti fotovoltaici</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Area dedicata alle attività sugli impianti, anche da smartphone.</p>
              <span className="mt-6 inline-flex items-center rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white group-hover:bg-red-600">Accedi all'area</span>
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-5 p-6 md:p-9">
            <button type="button" onClick={() => { setPortal(null); setPassword(''); setError(null); }}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-900"><ArrowLeft size={16} />Torna alla scelta</button>
            <div className="flex items-center gap-3 text-blue-900">
              {portal === 'admin' ? <Building2 size={27} /> : <HardHat size={27} />}
              <h2 className="text-xl font-bold">{portal === 'admin' ? 'Accesso amministrazione' : 'Accesso impianti FV'}</h2>
            </div>
            <form onSubmit={(e) => { void signIn(e); }} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Email
                <input type="email" required autoComplete="username" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 focus:border-blue-900 focus:outline-none" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Password
                <div className="relative mt-1">
                  <input type={visible ? 'text' : 'password'} required autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 pr-12 focus:border-blue-900 focus:outline-none" />
                  <button type="button" onClick={() => setVisible(v => !v)}
                    className="absolute right-3 top-3 text-slate-500" aria-label={visible ? 'Nascondi password' : 'Mostra password'}>
                    {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 py-3 font-semibold text-white disabled:opacity-50">
                <LockKeyhole size={17} />{busy ? 'Verifica in corso...' : 'Accedi con password'}
              </button>
            </form>
            <button type="button" onClick={() => { void recover(); }} disabled={recovering}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-blue-800 disabled:opacity-50">
              <Mail size={16} />{recovering ? 'Invio in corso...' : 'Password dimenticata?'}
            </button>
            {portal === 'fv' && (
              <section className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900"><MonitorPlay size={18} />Anteprima per la dimostrazione</div>
                <p className="mb-3 text-xs leading-relaxed text-amber-900">L'email impiantiFV@polatord.it è proposta ma non è ancora attiva. Puoi aprire una simulazione con dati inventati, isolata dal database aziendale. Nessuna credenziale fittizia viene inviata a Supabase.</p>
                <button type="button" onClick={onFvDemo}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600">
                  <ShieldCheck size={17} />Accedi alla demo FV
                </button>
              </section>
            )}
          </div>
        )}
        <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">Accesso aziendale protetto · Polato R&D</footer>
      </div>
    </main>
  );
}
