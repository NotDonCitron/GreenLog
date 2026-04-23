'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DatabaseZap,
  ImageOff,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '@/components/auth-provider';

type Operation = 'rollback' | 'cleanup';
type Mode = 'dry-run' | 'apply';
type LoadingKey = `${Operation}:${Mode}`;

interface MediaResult {
  table: string;
  column: string;
  total?: number;
  checked?: number;
  updated?: number;
  cleared?: number;
  skipped?: number;
  failed?: number;
  sample?: string[];
}

interface OperationResponse {
  mode: Mode;
  results: MediaResult[];
}

const OPERATIONS: Array<{
  key: Operation;
  title: string;
  eyebrow: string;
  description: string;
  endpoint: string;
  icon: typeof RotateCcw;
  accent: string;
  safeAction: string;
  applyAction: string;
}> = [
  {
    key: 'rollback',
    title: 'Storage URL Rollback',
    eyebrow: 'External URLs',
    description:
      'Findet Werte mit storage.cannalog.fun und schreibt sie auf interne /media-Pfade zurück.',
    endpoint: '/api/admin/rollback-image-urls',
    icon: RotateCcw,
    accent: 'text-sky-300 bg-sky-500/10 border-sky-400/20',
    safeAction: 'Rollback Dry-Run',
    applyAction: 'Rollback anwenden',
  },
  {
    key: 'cleanup',
    title: 'Missing Media Cleanup',
    eyebrow: 'Broken paths',
    description:
      'Prüft Profil- und Organisationsbilder unter /media und leert URLs, die wiederholt nicht erreichbar sind.',
    endpoint: '/api/admin/cleanup-missing-images',
    icon: ImageOff,
    accent: 'text-amber-300 bg-amber-500/10 border-amber-400/20',
    safeAction: 'Cleanup Dry-Run',
    applyAction: 'Cleanup anwenden',
  },
];

function getResultImpact(result: MediaResult) {
  return result.updated ?? result.cleared ?? 0;
}

function getResultScope(result: MediaResult) {
  return result.total ?? result.checked ?? 0;
}

function formatTarget(result: MediaResult) {
  return `${result.table}.${result.column}`;
}

function ResultTable({ results }: { results: MediaResult[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--card)]/40 p-5 text-sm text-[var(--muted-foreground)]">
        Keine Treffer im letzten Lauf.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/60">
      <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-[var(--border)]/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
        <span>Ziel</span>
        <span>Geprüft</span>
        <span>Treffer</span>
        <span>Fehler</span>
      </div>
      {results.map((result) => (
        <div key={`${result.table}.${result.column}`} className="border-b border-[var(--border)]/30 px-4 py-3 last:border-b-0">
          <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] items-center gap-3 text-sm">
            <span className="font-medium text-[var(--foreground)]">{formatTarget(result)}</span>
            <span className="text-[var(--muted-foreground)]">{getResultScope(result)}</span>
            <span className={getResultImpact(result) > 0 ? 'font-semibold text-emerald-300' : 'text-[var(--muted-foreground)]'}>
              {getResultImpact(result)}
            </span>
            <span className={result.failed ? 'font-semibold text-red-300' : 'text-[var(--muted-foreground)]'}>
              {result.failed ?? 0}
            </span>
          </div>

          {Array.isArray(result.sample) && result.sample.length > 0 && (
            <div className="mt-3 space-y-1 rounded-lg border border-[var(--border)]/30 bg-[var(--background)]/50 p-3">
              {result.sample.map((item) => (
                <p key={item} className="break-all text-xs text-[var(--muted-foreground)]">
                  {item}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminMediaPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [loadingKey, setLoadingKey] = useState<LoadingKey | null>(null);
  const [responses, setResponses] = useState<Partial<Record<Operation, OperationResponse>>>({});
  const [error, setError] = useState<string | null>(null);

  const adminIds = useMemo(
    () => (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
    [],
  );
  const isAdmin = !!user && adminIds.includes(user.id);

  const totals = useMemo(() => {
    const allResults = Object.values(responses).flatMap((response) => response?.results ?? []);
    return {
      checked: allResults.reduce((sum, result) => sum + getResultScope(result), 0),
      impacted: allResults.reduce((sum, result) => sum + getResultImpact(result), 0),
      failed: allResults.reduce((sum, result) => sum + (result.failed ?? 0), 0),
    };
  }, [responses]);

  const runOperation = async (operation: Operation, mode: Mode) => {
    if (!session?.access_token) {
      setError('Session fehlt. Bitte neu einloggen.');
      return;
    }

    const config = OPERATIONS.find((item) => item.key === operation);
    if (!config) return;

    if (mode === 'apply') {
      const confirmed = window.confirm(
        `${config.applyAction} wirklich ausführen? Bitte vorher den Dry-Run prüfen.`,
      );
      if (!confirmed) return;
    }

    setLoadingKey(`${operation}:${mode}`);
    setError(null);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ dryRun: mode === 'dry-run' }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = payload?.error?.message || payload?.error || 'Media-Aktion fehlgeschlagen.';
        setError(message);
        return;
      }

      setResponses((current) => ({
        ...current,
        [operation]: payload as OperationResponse,
      }));
    } catch {
      setError('Media-Aktion fehlgeschlagen. Netzwerkfehler.');
    } finally {
      setLoadingKey(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted-foreground)]" size={24} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 text-red-300" size={36} />
          <h1 className="text-lg font-semibold text-red-200">Admin-Zugriff erforderlich</h1>
          <p className="mt-2 text-sm text-red-200/70">
            Diese Wartungsseite darf nur von App-Admins genutzt werden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(6,12,10,0.96))] p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              <Sparkles size={12} />
              Media Repair Queue
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Bildpflege ohne Datenbank-Blindflug.
            </h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50/70">
              Starte zuerst einen Dry-Run, prüfe Treffer und Samples, und wende danach gezielt Rollback oder Cleanup an.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            {[
              { label: 'Geprüft', value: totals.checked },
              { label: 'Treffer', value: totals.impacted },
              { label: 'Fehler', value: totals.failed },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center">
                <p className="text-2xl font-black text-white">{item.value}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-50/50">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {OPERATIONS.map((operation) => {
          const Icon = operation.icon;
          const response = responses[operation.key];
          const isDryLoading = loadingKey === `${operation.key}:dry-run`;
          const isApplyLoading = loadingKey === `${operation.key}:apply`;
          const hasDryRun = response?.mode === 'dry-run';

          return (
            <section
              key={operation.key}
              className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]/60 p-5 shadow-lg shadow-black/5"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${operation.accent}`}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    {operation.eyebrow}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">{operation.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{operation.description}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => void runOperation(operation.key, 'dry-run')}
                  disabled={loadingKey !== null}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
                >
                  {isDryLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  {operation.safeAction}
                </button>
                <button
                  onClick={() => void runOperation(operation.key, 'apply')}
                  disabled={loadingKey !== null || !hasDryRun}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
                  title={!hasDryRun ? 'Bitte zuerst Dry-Run ausführen' : operation.applyAction}
                >
                  {isApplyLoading ? <Loader2 className="animate-spin" size={14} /> : <DatabaseZap size={14} />}
                  {operation.applyAction}
                </button>
              </div>

              <div className="mt-5">
                {response ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <CheckCircle2 size={14} className="text-emerald-300" />
                      Letzter Lauf: <strong className="text-[var(--foreground)]">{response.mode}</strong>
                    </div>
                    <ResultTable results={response.results} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)]/50 bg-[var(--background)]/40 p-5 text-sm text-[var(--muted-foreground)]">
                    Noch kein Lauf. Starte einen Dry-Run, um betroffene Datensätze zu sehen.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
