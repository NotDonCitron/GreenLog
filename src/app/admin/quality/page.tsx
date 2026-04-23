'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Image,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';

import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { getStrainPublicationSnapshot, type StrainPublicationRequirement } from '@/lib/strains/publication';
import { getStrainSourcePolicy, type StrainSourceTier } from '@/lib/strains/source-policy';
import type { Strain } from '@/lib/types';

type StrainRow = Pick<
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
> & {
  created_at?: string | null;
};

type EnrichedStrain = {
  strain: StrainRow;
  canPublish: boolean;
  missing: StrainPublicationRequirement[];
  qualityScore: number;
  sourceTier: StrainSourceTier;
  sourceLabel: string;
  hasPlaceholderImage: boolean;
  hasImage: boolean;
};

const REQUIREMENT_LABELS: Record<StrainPublicationRequirement, string> = {
  name: 'Name',
  slug: 'Slug',
  type: 'Typ',
  description: 'Beschreibung',
  thc: 'THC',
  cbd: 'CBD',
  terpenes: 'Terpene',
  flavors: 'Aromen',
  effects: 'Effekte',
  image: 'Bild',
  source: 'Quelle',
};

function isPlaceholderImage(strain: StrainRow) {
  const haystack = `${strain.image_url ?? ''} ${strain.canonical_image_path ?? ''}`.toLowerCase();
  return haystack.includes('placeholder');
}

function percent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function StatCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass = {
    neutral: 'border-white/10 bg-white/[0.06] text-white',
    good: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
    warn: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    bad: 'border-red-300/20 bg-red-300/10 text-red-100',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60">{label}</p>
      <p className="mt-3 text-xs leading-5 opacity-75">{detail}</p>
    </div>
  );
}

function ProgressRow({ label, value, total, tone = 'emerald' }: { label: string; value: number; total: number; tone?: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const pct = percent(value, total);
  const fill = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-300',
    red: 'bg-red-400',
    sky: 'bg-sky-300',
  }[tone];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--foreground)]">{label}</span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CandidateRow({ item }: { item: EnrichedStrain }) {
  return (
    <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-[var(--foreground)]">{item.strain.name}</h3>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              {item.qualityScore}%
            </span>
            <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {item.strain.publication_status}
            </span>
            <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
              {item.sourceLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {item.strain.slug} · {item.strain.type || 'ohne Typ'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {item.hasPlaceholderImage && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              <Image size={10} />
              Placeholder
            </span>
          )}
          {item.missing.slice(0, 3).map((field) => (
            <span key={field} className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
              <AlertCircle size={10} />
              {REQUIREMENT_LABELS[field]}
            </span>
          ))}
          {item.missing.length === 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <CheckCircle2 size={10} />
              Gate erfüllt
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminQualityPage() {
  const { user, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<StrainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const adminIds = useMemo(
    () => (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
    [],
  );
  const isAdmin = !!user && adminIds.includes(user.id);

  const fetchQualityData = async () => {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('strains')
      .select(
        'id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, flavors, effects, image_url, canonical_image_path, publication_status, primary_source, source_notes, created_at',
      )
      .order('name', { ascending: true })
      .limit(5000);

    if (loadError) {
      setError(loadError.message);
      setStrains([]);
    } else {
      setStrains((data as StrainRow[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    void fetchQualityData();
  }, [authLoading, isAdmin]);

  const enriched = useMemo<EnrichedStrain[]>(() => {
    return strains.map((strain) => {
      const snapshot = getStrainPublicationSnapshot(strain);
      const source = getStrainSourcePolicy(strain.primary_source);
      const hasImage = Boolean(strain.image_url?.trim() && strain.canonical_image_path?.trim());

      return {
        strain,
        canPublish: snapshot.canPublish,
        missing: snapshot.missing,
        qualityScore: snapshot.qualityScore,
        sourceTier: source.tier,
        sourceLabel: source.label,
        hasPlaceholderImage: isPlaceholderImage(strain),
        hasImage,
      };
    });
  }, [strains]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const published = enriched.filter((item) => item.strain.publication_status === 'published').length;
    const review = enriched.filter((item) => item.strain.publication_status === 'review').length;
    const draft = enriched.filter((item) => item.strain.publication_status === 'draft').length;
    const rejected = enriched.filter((item) => item.strain.publication_status === 'rejected').length;
    const publishReady = enriched.filter((item) => item.canPublish).length;
    const placeholder = enriched.filter((item) => item.hasPlaceholderImage).length;
    const missingImage = enriched.filter((item) => !item.hasImage).length;
    const avgQuality = total === 0 ? 0 : Math.round(enriched.reduce((sum, item) => sum + item.qualityScore, 0) / total);

    const sourceTiers = {
      primary: enriched.filter((item) => item.sourceTier === 'primary').length,
      fallback: enriched.filter((item) => item.sourceTier === 'fallback').length,
      review: enriched.filter((item) => item.sourceTier === 'review').length,
    };

    const missingCounts = Object.keys(REQUIREMENT_LABELS).reduce((acc, key) => {
      acc[key as StrainPublicationRequirement] = enriched.filter((item) => item.missing.includes(key as StrainPublicationRequirement)).length;
      return acc;
    }, {} as Record<StrainPublicationRequirement, number>);

    return { total, published, review, draft, rejected, publishReady, placeholder, missingImage, avgQuality, sourceTiers, missingCounts };
  }, [enriched]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return enriched
      .filter((item) => item.strain.publication_status !== 'published')
      .filter((item) => {
        if (!normalizedQuery) return true;
        return `${item.strain.name} ${item.strain.slug} ${item.strain.primary_source ?? ''}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (a.canPublish !== b.canPublish) return a.canPublish ? -1 : 1;
        if (a.hasPlaceholderImage !== b.hasPlaceholderImage) return a.hasPlaceholderImage ? 1 : -1;
        return b.qualityScore - a.qualityScore;
      })
      .slice(0, 20);
  }, [enriched, query]);

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
          <p className="mt-2 text-sm text-red-200/70">
            Diese Auswertung darf nur von App-Admins genutzt werden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-lime-300/15 bg-[radial-gradient(circle_at_18%_20%,rgba(190,242,100,0.22),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.16),transparent_26%),linear-gradient(135deg,rgba(8,16,14,0.98),rgba(15,23,42,0.96))] p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-200/20 bg-lime-200/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-lime-100">
              <Radar size={12} />
              Content Quality Radar
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Welche Strains verdienen als Nächstes Aufmerksamkeit?
            </h1>
            <p className="mt-3 text-sm leading-6 text-lime-50/70">
              Read-only Blick auf Publish-Gate, Quellenqualität, Bildstatus und die nächsten besten Kandidaten für die Moderation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[420px] sm:grid-cols-4">
            <StatCard label="Total" value={stats.total} detail="Alle geladenen Strains" />
            <StatCard label="Ø Qualität" value={`${stats.avgQuality}%`} detail="Publish-Gate Score" tone="good" />
            <StatCard label="Ready" value={stats.publishReady} detail={`${percent(stats.publishReady, stats.total)}% erfüllen das Gate`} tone="good" />
            <StatCard label="Placeholder" value={stats.placeholder} detail="Bilder mit Placeholder-Hinweis" tone={stats.placeholder > 0 ? 'warn' : 'neutral'} />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]/60 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Publish Pipeline</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">Status-Verteilung</h2>
            </div>
            <BadgeCheck className="text-emerald-300" size={22} />
          </div>
          <div className="space-y-4">
            <ProgressRow label="Published" value={stats.published} total={stats.total} tone="emerald" />
            <ProgressRow label="Review" value={stats.review} total={stats.total} tone="sky" />
            <ProgressRow label="Draft" value={stats.draft} total={stats.total} tone="amber" />
            <ProgressRow label="Rejected" value={stats.rejected} total={stats.total} tone="red" />
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]/60 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Source Policy</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">Quellenqualität</h2>
            </div>
            <BarChart3 className="text-sky-300" size={22} />
          </div>
          <div className="space-y-4">
            <ProgressRow label="Primärquellen" value={stats.sourceTiers.primary} total={stats.total} tone="emerald" />
            <ProgressRow label="Fallback-Quellen" value={stats.sourceTiers.fallback} total={stats.total} tone="amber" />
            <ProgressRow label="Review-Quellen" value={stats.sourceTiers.review} total={stats.total} tone="red" />
            <ProgressRow label="Fehlendes Bild" value={stats.missingImage} total={stats.total} tone="red" />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]/60 p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Gate Gaps</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">Häufigste Qualitätslücken</h2>
          </div>
          <TriangleAlert className="text-amber-300" size={22} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(stats.missingCounts) as Array<[StrainPublicationRequirement, number]>)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([key, value]) => (
              <div key={key} className="rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--foreground)]">{REQUIREMENT_LABELS[key]}</span>
                  <span className={value > 0 ? 'text-sm font-black text-amber-300' : 'text-sm font-black text-emerald-300'}>{value}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
                  <div className="h-full rounded-full bg-amber-300" style={{ width: `${percent(value, stats.total)}%` }} />
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]/60 p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Next Best Actions</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">Nächste 20 Moderations-Kandidaten</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Sortiert nach Gate erfüllt, keinem Placeholder und höchstem Quality Score.
            </p>
          </div>
          <button
            onClick={() => void fetchQualityData()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            <RefreshCw size={14} />
            Aktualisieren
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kandidaten nach Name, Slug oder Quelle filtern..."
            className="w-full rounded-lg border border-[var(--border)]/50 bg-[var(--background)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50"
          />
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)]/50 bg-[var(--background)]/40 p-8 text-center">
            <Sparkles className="mx-auto mb-3 text-emerald-300" size={28} />
            <p className="text-sm text-[var(--muted-foreground)]">Keine passenden offenen Kandidaten gefunden.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCandidates.map((item) => (
              <CandidateRow key={item.strain.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
