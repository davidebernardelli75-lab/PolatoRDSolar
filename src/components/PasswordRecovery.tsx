import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { clearLocalSupabaseAuth, supabase } from '@/lib/supabase';

interface PasswordRecoveryProps {
  onComplete: () => void;
}

export function PasswordRecovery({ onComplete }: PasswordRecoveryProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;
        if (sessionError || !session) {
          setError('Link di recupero non valido o scaduto. Torna alla schermata di accesso e richiedi una nuova email.');
          setLinkReady(false);
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError || !user) {
          setError('Non è stato possibile verificare il link di recupero. Richiedi una nuova email.');
          setLinkReady(false);
          return;
        }

        setLinkReady(true);
        setError(null);
      } catch {
        if (!active) return;
        setError('Impossibile verificare il link di recupero. Riprova richiedendo una nuova email.');
        setLinkReady(false);
      } finally {
        if (active) setCheckingLink(false);
      }
    })();

    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError('La nuova password deve contenere almeno 12 caratteri.');
      return;
    }
    if (password !== confirm) {
      setError('Le due password non coincidono.');
      return;
    }
    if (!linkReady) {
      setError('Il link di recupero non è pronto o non è più valido. Richiedi una nuova email.');
      return;
    }

    setSaving(true);
    setSessionWarning(null);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const message = updateError.message.toLowerCase();
        if (message.includes('weak') || message.includes('password')) {
          throw new Error(`La nuova password è stata rifiutata dal servizio di autenticazione: ${updateError.message}`);
        }
        throw updateError;
      }
      if (!data.user) {
        throw new Error('Il servizio non ha confermato l’aggiornamento della password. Riprova con un nuovo link.');
      }

      setPassword('');
      setConfirm('');
      setSuccess(true);

      // Security requirement: once the admin password changes, invalidate every
      // existing session for this account so previously authenticated devices
      // must use the new password.
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
      clearLocalSupabaseAuth();
      if (signOutError) {
        setSessionWarning('Password aggiornata, ma non è stato possibile confermare la chiusura di tutte le sessioni remote. Accedi di nuovo e ripeti il logout se necessario.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non è stato possibile aggiornare la password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-blue-900 p-7 text-center text-white">
          <img src="/assets/images/Polato_R&D.png" alt="Polato R&D"
            className="mx-auto mb-4 h-20 w-36 rounded-xl bg-white object-contain p-2" />
          <h1 className="text-xl font-bold">Reimposta la password</h1>
          <p className="mt-1 text-sm text-blue-100">Crea una nuova password per il tuo account aziendale.</p>
        </div>
        {success ? (
          <div className="space-y-4 p-7 text-center">
            <ShieldCheck size={36} className="mx-auto text-emerald-600" />
            <h2 className="font-semibold">Password aggiornata</h2>
            <p className="text-sm text-slate-600">Accedi nuovamente usando la nuova password. Le sessioni già aperte vengono invalidate per impedire l’accesso con credenziali precedenti.</p>
            {sessionWarning && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{sessionWarning}</p>}
            <button type="button" onClick={onComplete}
              className="w-full rounded-lg bg-blue-900 py-3 font-semibold text-white">
              Torna all'accesso
            </button>
          </div>
        ) : checkingLink ? (
          <div className="p-7 text-center text-sm text-slate-600">Verifica del link di recupero…</div>
        ) : !linkReady ? (
          <div className="space-y-4 p-7 text-center">
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="button" onClick={onComplete}
              className="w-full rounded-lg bg-blue-900 py-3 font-semibold text-white">
              Torna all'accesso
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => { void submit(event); }} className="space-y-4 p-7">
            <div className="flex items-center gap-2 text-blue-900"><LockKeyhole size={20} />Nuova password</div>
            <label className="block text-sm font-medium text-slate-700">Password (almeno 12 caratteri)
              <div className="relative mt-1">
                <input type={visible ? 'text' : 'password'}  data-preserve-case="true" autoCapitalize="none" spellCheck={false} required minLength={12}
                  autoComplete="new-password" value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 pr-12" />
                <button type="button" onClick={() => setVisible((x) => !x)}
                  aria-label={visible ? 'Nascondi password' : 'Mostra password'}
                  className="absolute right-3 top-3 text-slate-500">
                  {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            <label className="block text-sm font-medium text-slate-700">Conferma nuova password
              <input type={visible ? 'text' : 'password'}  data-preserve-case="true" autoCapitalize="none" spellCheck={false} required minLength={12}
                autoComplete="new-password" value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3" />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={saving} type="submit"
              className="w-full rounded-lg bg-red-500 py-3 font-semibold text-white disabled:opacity-50">
              {saving ? 'Aggiornamento in corso…' : 'Salva nuova password'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
