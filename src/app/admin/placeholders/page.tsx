'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ImageOff,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { resolvePublicMediaUrl } from '@/lib/public-media-url';
import { getStrainPublicationSnapshot } from '@/lib/strains/publication';
import { getStrainSourcePolicy } from '@/lib/strains/source-policy';
import type { Strain } from '@/lib/types';

type PlaceholderStrain = Pick<
  Strain,
  | 'id'
  | 'name'
  | 'slug'
  | 'type'
  | 'description'
  | 'thc_min'
  | 'thc_max'
  | 'cbd_min'
  | 'cbd_max'
  | 'terpenes'
  | 'flavors'
  | 'effects'
  | 'image_url'
  | 'canonical_image_path'
  | 'publication_status'
  | 'primary_source'
  | 'source_notes'
>;

function isPlaceholder(strain: PlaceholderStrain) {
  const value = `${strain.image_url ?? ''} ${strain.canonical_image_path ?? ''}`.toLowerCase();
  return value.includes('placeholder');
}

function getImageUrl(strain: PlaceholderStrain) {
  return resolvePublicMediaUrl(strain.image_url || (strain.canonical_image_path?.startsWith('/') ? strain.canonical_image_path : null));
}

function getPriority(strain: PlaceholderStrain) {
  const snapshot = getStrainPublicationSnapshot(strain);
  if (strain.publication_status === 'published') return 'critical';
  if (snapshot.canPublish) return 'high';
  if (snapshot.qualityScore >= 80) return 'medium';
  return 'low';
}

function PriorityPill({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-300 border-red-500/20',
    high: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    medium: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    low: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]/50',
  };

  const labels: Record<string, string> = {
    critical: 'Published Placeholder',
    high: 'Publish-ready',
    medium: 'Fast fertig',
    low: 'Niedrig',
  };

  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
}

function PlaceholderCard({ strain }: { strain: PlaceholderStrain }) {
  const snapshot = getStrainPublicationSnapshot(strain);
  const source = getStrainSourcePolicy(strain.primary_source);
  const priority = getPriority(strain);
  const imageUrl = getImageUrl(strain);

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]/60 shadow-lg shadow-black/5">
      <div className="grid gap-0 md:grid-cols-[180px_1fr]">
        <div className="relative min-h-44 bg-[var(--muted)]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={strain.name} className="h-full min-h-44 w-full object-cover opacity-75 grayscale" />
          ) : (
            <div className="flex h-full min-h-44 items-center justify-center text-[var(--muted-foreground)]">
              <ImageOff size={28} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              <Camera size={10} />
              Placeholder
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-[var(--foreground)]">{strain.name}</h2>
              <PriorityPill priority={priority} />
              <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {strain.publication_status}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {strain.slug} · {strain.type || 'ohne Typ'} · {source.label}
            </p>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {strain.description || 'Keine Beschreibung vorhanden.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              Quality {snapshot.qualityScore}%
            </span>
            {snapshot.missing.slice(0, 3).map((field) => (
              <span key={field} className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300">
                fehlt: {field}
              </span>
            ))}
            {snapshot.missing.length === 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                <CheckCircle2 size={12} />
                Gate erfüllt
              </span>
            )}
            <Link
              href={`/admin/strains?search=${encodeURIComponent(strain.name)}&scope=all`}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              In Moderation öffnen
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminPlaceholdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<PlaceholderStrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const adminIds = useMemo(
    () => (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
    [],
  );
  const isAdmin = !!user && adminIds.includes(user.id);

  const fetchPlaceholders = async () => {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('strains')
      .select(
        'id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, flavors, effects, image_url, canonical_image_path, publication_status, primary_source, source_notes',
      )
      .or('image_url.ilike.%placeholder%,canonical_image_path.ilike.%placeholder%')
      .order('publication_status', { ascending: true })
      .order('name', { ascending: true })
      .limit(500);

    if (loadError) {
      setError(loadError.message);
      setStrains([]);
    } else {
      setStrains(((data as PlaceholderStrain[]) ?? []).filter(isPlaceholder));
    }

    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    void fetchPlaceholders();
  }, [authLoading, isAdmin]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return strains
      .filter((strain) => {
        if (!normalized) return true;
        return `${strain.name} ${strain.slug} ${strain.primary_source ?? ''}`.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = order[getPriority(a) as keyof typeof order] - order[getPriority(b) as keyof typeof order];
        if (priorityDiff !== 0) return priorityDiff;
        return getStrainPublicationSnapshot(b).qualityScore - getStrainPublicationSnapshot(a).qualityScore;
      });
  }, [strains, query]);

  const stats = useMemo(() => {
    return {
      total: strains.length,
      published: strains.filter((strain) => strain.publication_status === 'published').length,
      ready: strains.filter((strain) => getStrainPublicationSnapshot(strain).canPublish).length,
      highPriority: strains.filter((strain) => ['critical', 'high'].includes(getPriority(strain))).length,
    };
  }, [strains]);

  if (authLoading || loading) {
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
          <p className="mt-2 text-sm text-red-200/70">Diese Queue darf nur von App-Admins genutzt werden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-amber-300/20 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.22),transparent_30%),linear-gradient(135deg,rgba(18,13,7,0.98),rgba(15,23,42,0.96))] p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100">
              <ImageOff size={12} />
              Placeholder Replacement Queue
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Welche Sorten brauchen echte Bilder?
            </h1>
            <p className="mt-3 text-sm leading-6 text-amber-50/70">
              Fokusliste für Placeholder-Bilder, priorisiert nach veröffentlichten und publish-ready Strains.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[420px] sm:grid-cols-4">
            {[
              { label: 'Total', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Ready', value: stats.ready },
              { label: 'High', value: stats.highPriority },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center">
                <p className="text-2xl font-black text-white">{item.value}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-50/50">{item.label}</p>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nach Name, Slug oder Quelle filtern..."
            className="w-full rounded-lg border border-[var(--border)]/50 bg-[var(--card)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50"
          />
        </div>
        <button
          onClick={() => void fetchPlaceholders()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)]/50 bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          <RefreshCw size={14} />
          Aktualisieren
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)]/50 bg-[var(--card)]/50 p-12 text-center">
          <Sparkles className="mx-auto mb-3 text-emerald-300" size={32} />
          <p className="text-sm text-[var(--muted-foreground)]">Keine Placeholder-Strains gefunden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((strain) => (
            <PlaceholderCard key={strain.id} strain={strain} />
          ))}
        </div>
      )}
    </div>
  );
}
