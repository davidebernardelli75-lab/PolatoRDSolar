import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '@/lib/error-reporting';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    reportClientError('react', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Errore applicazione</h1>
            <p className="mt-2 text-sm text-slate-600">
              Si è verificato un errore imprevisto. L&apos;evento è stato registrato per la verifica.
            </p>
            <button
              type="button"
              className="mt-5 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
              onClick={() => window.location.reload()}
            >
              Ricarica applicazione
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
