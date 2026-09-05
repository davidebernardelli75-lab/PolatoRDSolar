import { FormEvent, useState } from 'react';
import { LockKeyhole, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError('Credenziali non valide. Controlla email e password.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-blue-900 px-8 py-8 text-center text-white">
          <img src="/assets/images/Polato_R&D.png" alt="Polato R&D" className="mx-auto mb-4 h-20 w-36 rounded-xl bg-white object-contain p-2" />
          <h1 className="text-xl font-bold">Solar Archive</h1>
          <p className="mt-1 text-sm text-blue-100">Area aziendale riservata</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 px-8 py-8">
          <div className="flex items-center gap-3 text-blue-900"><LockKeyhole size={22} /><h2 className="font-semibold">Accedi all'archivio</h2></div>
          <label className="block text-sm font-medium text-slate-700">Email aziendale
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-70">{loading ? 'Accesso in corso…' : 'Accedi'}</button>
          <p className="flex items-center justify-center gap-2 text-xs text-slate-500"><Sun size={14} className="text-red-500" />Credenziali riservate al personale autorizzato</p>
        </form>
      </section>
    </main>
  );
}
