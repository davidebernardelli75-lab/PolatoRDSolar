import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PasswordRecoveryProps {
  onComplete: () => void;
}

export function PasswordRecovery({ onComplete }: PasswordRecoveryProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    setSaving(true);
    try {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) {
        throw new Error('Link non valido o scaduto. Torna alla schermata di accesso e richiedine uno nuovo.');
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setPassword('');
      setConfirm('');
      // Terminate the temporary recovery session so the new password is
      // required to log back in. Recovery must never open private dashboards
      // without a fresh login.
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
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
            <p className="text-sm text-slate-600">Accedi nuovamente usando la nuova password. Se l'account è condiviso, informa il responsabile delle credenziali.</p>
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
                <input type={visible ? 'text' : 'password'} required minLength={12}
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
              <input type={visible ? 'text' : 'password'} required minLength={12}
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
