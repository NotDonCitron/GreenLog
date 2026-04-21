'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
  ArrowRight,
  Flag,
  ThumbsDown,
} from 'lucide-react';

interface Strain {
  id: string;
  organization_id: string | null;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  thc_min: number | null;
  thc_max: number | null;
  cbd_min: number | null;
  cbd_max: number | null;
  terpenes: string[];
  flavors: string[];
  effects: string[];
  image_url: string | null;
  canonical_image_path: string | null;
  publication_status: 'draft' | 'review' | 'published' | 'rejected' | string;
  primary_source: string;
  source_notes: string | null;
}

type Completeness = {
  name: boolean;
  slug: boolean;
  type: boolean;
  description: boolean;
  thc: boolean;
  terpenes: boolean;
  flavors: boolean;
  effects: boolean;
  image: boolean;
  source: boolean;
};

type Recommendation = 'publish_ready' | 'needs_review' | 'weak_candidate';

const COMPLETENESS_KEYS: Array<keyof Completeness> = [
  'name',
  'slug',
  'type',
  'description',
  'thc',
  'terpenes',
  'flavors',
  'effects',
  'image',
  'source',
];

function formatRange(min: number | null, max: number | null) {
  if (min !== null && max !== null) return `${min}–${max}%`;
  if (min !== null) return `min ${min}%`;
  if (max !== null) return `max ${max}%`;
  return '—';
}

function getCompleteness(strain: Strain): Completeness {
  return {
    name: !!strain.name,
    slug: !!strain.slug,
    type: !!strain.type,
    description: !!strain.description?.trim(),
    thc: strain.thc_min !== null || strain.thc_max !== null,
    terpenes: Array.isArray(strain.terpenes) && strain.terpenes.length >= 2,
    flavors: Array.isArray(strain.flavors) && strain.flavors.length >= 1,
    effects: Array.isArray(strain.effects) && strain.effects.length >= 1,
    image: !!strain.image_url || !!strain.canonical_image_path,
    source: !!strain.primary_source?.trim(),
  };
}

function evaluateStrain(strain: Strain, completeness: Completeness) {
  const completeCount = COMPLETENESS_KEYS.filter((key) => completeness[key]).length;
  const missing = COMPLETENESS_KEYS.filter((key) => !completeness[key]);

  const goodReasons: string[] = [];
  if (completeness.name && completeness.slug) goodReasons.push('Identität eindeutig');
  if (completeness.thc) goodReasons.push('Cannabinoid-Werte vorhanden');
  if (completeness.description && completeness.effects) goodReasons.push('Wirkung dokumentiert');
  if (completeness.image) goodReasons.push('Bild vorhanden');
  if (completeness.source) goodReasons.push('Quelle dokumentiert');

  const badReasons = missing.slice(0, 4).map((key) => {
    const labels: Record<string, string> = {
      name: 'Name', slug: 'Slug', type: 'Type', description: 'Beschreibung',
      thc: 'THC', terpenes: 'Terpene', flavors: 'Aromen', effects: 'Effekte',
      image: 'Bild', source: 'Quelle',
    };
    return labels[key] || key;
  });

  let recommendation: Recommendation = 'needs_review';
  if (completeCount >= 9 && completeness.image && completeness.source && completeness.description) {
    recommendation = 'publish_ready';
  } else if (!completeness.name || !completeness.slug || !completeness.source || completeCount <= 6) {
    recommendation = 'weak_candidate';
  }

  return { completeCount, missing, goodReasons, badReasons, recommendation };
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  const pct = Math.round((score / total) * 100);
  const color = pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400';
  const bg = pct >= 90 ? 'bg-emerald-400/10' : pct >= 70 ? 'bg-amber-400/10' : 'bg-red-400/10';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${bg} ${color}`}>
      {score}/{total}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'review') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
        <Eye size={10} /> Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
      Draft
    </span>
  );
}

function RecommendationPill({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation === 'publish_ready') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
        <CheckCircle2 size={10} /> Publish Ready
      </span>
    );
  }
  if (recommendation === 'weak_candidate') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
        <XCircle size={10} /> Schwach
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
      Needs Review
    </span>
  );
}

function StrainImage({ imageUrl, canonicalPath, name }: { imageUrl: string | null; canonicalPath: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const url = imageUrl || canonicalPath;

  if (!url || broken) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[var(--border)]/50 text-[10px] text-[var(--muted-foreground)]">
        Kein Bild
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        className="h-16 w-16 rounded-lg border border-[var(--border)]/50 object-cover"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    </a>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-20 shrink-0 font-medium text-[var(--muted-foreground)]">{label}</span>
      <span className="text-[var(--foreground)] break-words">{value}</span>
    </div>
  );
}

export default function AdminStrainsPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'review'>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | Recommendation>('all');

  const ADMIN_IDS = (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
  const isAdmin = user && ADMIN_IDS.includes(user.id);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    void fetchStrains();
  }, [authLoading, isAdmin]);

  const fetchStrains = async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('strains')
      .select('*')
      .in('publication_status', ['draft', 'review'])
      .order('publication_status', { ascending: true })
      .order('name', { ascending: true });

    if (err) {
      console.error('Error fetching strains:', err);
      setError(err.message);
      setStrains([]);
    } else {
      setStrains((data as Strain[]) || []);
    }

    setLoading(false);
  };

  const updateStatus = async (strain: Strain, status: 'review' | 'published' | 'rejected') => {
    if (!session?.access_token) {
      setError('Session fehlt. Bitte neu einloggen.');
      return;
    }

    setIsUpdating(strain.id);
    setActionMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/strains/${strain.id}/publication`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ publication_status: status }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const missingFields = Array.isArray(payload?.error?.details?.missing)
        ? payload.error.details.missing.join(', ')
        : null;
      const baseMessage = payload?.error?.message || 'Status-Update fehlgeschlagen.';
      setError(missingFields ? `${baseMessage} Fehlend: ${missingFields}` : baseMessage);
      setIsUpdating(null);
      return;
    }

    if (status === 'published') {
      setActionMessage(
        strain.organization_id
          ? 'Publiziert: Org-Strain. Sichtbar im Org-Tab von /strains (für Mitglieder).'
          : 'Publiziert: Sichtbar im Catalog-Tab von /strains.'
      );
    } else if (status === 'review') {
      setActionMessage('Sorte wurde auf Review gesetzt.');
    } else {
      setActionMessage('Sorte wurde abgelehnt.');
    }

    await fetchStrains();
    setIsUpdating(null);
  };

  const enriched = useMemo(() => {
    const rows = strains.map((strain) => {
      const completeness = getCompleteness(strain);
      const evaluation = evaluateStrain(strain, completeness);
      return { strain, completeness, ...evaluation };
    });

    const priority: Record<Recommendation, number> = {
      publish_ready: 0,
      needs_review: 1,
      weak_candidate: 2,
    };

    return rows.sort((a, b) => {
      if (priority[a.recommendation] !== priority[b.recommendation]) {
        return priority[a.recommendation] - priority[b.recommendation];
      }
      return b.completeCount - a.completeCount;
    });
  }, [strains]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return enriched.filter((row) => {
      const { strain } = row;
      const matchesStatus = statusFilter === 'all' || strain.publication_status === statusFilter;
      const matchesRecommendation = recommendationFilter === 'all' || row.recommendation === recommendationFilter;
      if (!matchesStatus || !matchesRecommendation) return false;

      if (!needle) return true;

      return (
        strain.name.toLowerCase().includes(needle)
        || strain.slug.toLowerCase().includes(needle)
        || (strain.primary_source || '').toLowerCase().includes(needle)
      );
    });
  }, [enriched, query, statusFilter, recommendationFilter]);

  const stats = useMemo(() => {
    return {
      total: enriched.length,
      draft: enriched.filter((item) => item.strain.publication_status === 'draft').length,
      review: enriched.filter((item) => item.strain.publication_status === 'review').length,
      ready: enriched.filter((item) => item.recommendation === 'publish_ready').length,
      weak: enriched.filter((item) => item.recommendation === 'weak_candidate').length,
    };
  }, [enriched]);

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
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={36} />
          <h1 className="text-lg font-bold text-red-300">Zugriff verweigert</h1>
          <p className="mt-1 text-sm text-red-200/60">Admin-Berechtigung erforderlich.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted-foreground)]" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={36} />
          <p className="text-sm text-red-200">{error}</p>
          <button
            onClick={() => void fetchStrains()}
            className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-400/20"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Strain Moderation</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {stats.total} Sorten in der Warteschlange · {stats.ready} bereit zum Veröffentlichen
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <strong className="text-amber-400">Draft</strong> — Neu importiert, noch nicht geprüft
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <strong className="text-sky-400">Review</strong> — Markiert zur genaueren Prüfung
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <strong className="text-emerald-400">Bereit</strong> — Alle Felder vollständig, kann veröffentlicht werden
            </span>
          </div>
        </div>
        <button
          onClick={() => void fetchStrains()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)]/50 bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          <RefreshCw size={14} />
          Aktualisieren
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--muted-foreground)]">Gesamt</span>
          <span className="text-sm font-bold text-[var(--foreground)]">{stats.total}</span>
        </div>
        <div className="h-4 w-px bg-[var(--border)]/50" />
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs text-[var(--muted-foreground)]">Draft</span>
          <span className="text-sm font-bold text-amber-400">{stats.draft}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="text-xs text-[var(--muted-foreground)]">Review</span>
          <span className="text-sm font-bold text-sky-400">{stats.review}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-[var(--muted-foreground)]">Bereit</span>
          <span className="text-sm font-bold text-emerald-400">{stats.ready}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="text-xs text-[var(--muted-foreground)]">Schwach</span>
          <span className="text-sm font-bold text-red-400">{stats.weak}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Suche nach Name, Slug, Quelle..."
            className="w-full rounded-lg border border-[var(--border)]/50 bg-[var(--card)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Status:</span>
          {([
            { key: 'all' as const, label: 'Alle' },
            { key: 'draft' as const, label: 'Neu (Draft)' },
            { key: 'review' as const, label: 'Zur Prüfung (Review)' },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === item.key
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="mx-1 hidden w-px bg-[var(--border)]/50 sm:block" />
          <span className="flex items-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Empfehlung:</span>
          {([
            { key: 'all' as const, label: 'Alle' },
            { key: 'publish_ready' as const, label: 'Bereit' },
            { key: 'needs_review' as const, label: 'Prüfen' },
            { key: 'weak_candidate' as const, label: 'Schwach' },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setRecommendationFilter(item.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                recommendationFilter === item.key
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-300">
          {actionMessage}
        </div>
      )}

      {/* Strain list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/50 p-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Keine passenden Strains gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const { strain, completeness, completeCount, missing, recommendation, goodReasons, badReasons } = row;
            const isExpanded = expandedId === strain.id;
            const isRowUpdating = isUpdating === strain.id;

            return (
              <div
                key={strain.id}
                className={`group rounded-xl border bg-[var(--card)]/50 transition-colors hover:bg-[var(--card)] ${
                  isExpanded ? 'border-[var(--primary)]/30' : 'border-[var(--border)]/50'
                }`}
              >
                {/* Main row */}
                <div className="flex items-start gap-4 p-4">
                  {/* Image */}
                  <div className="hidden shrink-0 sm:block">
                    <StrainImage imageUrl={strain.image_url} canonicalPath={strain.canonical_image_path} name={strain.name} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--foreground)]">{strain.name}</h2>
                      <StatusPill status={strain.publication_status} />
                      <RecommendationPill recommendation={recommendation} />
                      <ScoreBadge score={completeCount} total={COMPLETENESS_KEYS.length} />
                    </div>

                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {strain.slug}
                      {strain.type && ` · ${strain.type}`}
                      {strain.primary_source && ` · ${strain.primary_source}`}
                    </p>

                    {/* Quick issues */}
                    {badReasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {badReasons.map((reason) => (
                          <span
                            key={reason}
                            className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400"
                          >
                            <X size={10} /> {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : strain.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        title="Alle Felder und Beschreibung anzeigen"
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isExpanded ? 'Weniger' : 'Details'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => void updateStatus(strain, 'review')}
                          disabled={isRowUpdating || strain.publication_status === 'review'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-40"
                          title="Markiert die Sorte zur genaueren Prüfung"
                        >
                          <Eye size={12} />
                          Zur Prüfung
                        </button>
                        <button
                          onClick={() => void updateStatus(strain, 'published')}
                          disabled={isRowUpdating || recommendation !== 'publish_ready'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
                          title={recommendation !== 'publish_ready' ? 'Zuerst Datenqualität verbessern' : 'Veröffentlichen'}
                        >
                          <Check size={12} />
                          Veröffentlichen
                        </button>
                        <button
                          onClick={() => void updateStatus(strain, 'rejected')}
                          disabled={isRowUpdating}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                          title="Sorte ablehnen und aus der Warteschlange entfernen"
                        >
                          <X size={12} />
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)]/50 px-4 pb-4 pt-3">
                    {/* Completeness grid */}
                    <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-5">
                      {COMPLETENESS_KEYS.map((key) => {
                        const labels: Record<string, string> = {
                          name: 'Name', slug: 'Slug', type: 'Type', description: 'Beschreibung',
                          thc: 'THC', terpenes: 'Terpene', flavors: 'Aromen', effects: 'Effekte',
                          image: 'Bild', source: 'Quelle',
                        };
                        const ok = completeness[key];
                        return (
                          <div key={key} className="flex items-center gap-1.5 text-xs">
                            {ok ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <X size={12} className="text-red-400" />
                            )}
                            <span className={ok ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>
                              {labels[key]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Details grid */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <FieldRow label="Name" value={strain.name || '—'} />
                        <FieldRow label="Slug" value={strain.slug || '—'} />
                        <FieldRow label="Typ" value={strain.type || '—'} />
                        <FieldRow label="Quelle" value={strain.primary_source || '—'} />
                        <FieldRow label="THC" value={formatRange(strain.thc_min, strain.thc_max)} />
                        <FieldRow label="CBD" value={formatRange(strain.cbd_min, strain.cbd_max)} />
                        <FieldRow label="Terpene" value={Array.isArray(strain.terpenes) && strain.terpenes.length > 0 ? strain.terpenes.join(', ') : '—'} />
                        <FieldRow label="Aromen" value={Array.isArray(strain.flavors) && strain.flavors.length > 0 ? strain.flavors.join(', ') : '—'} />
                        <FieldRow label="Effekte" value={Array.isArray(strain.effects) && strain.effects.length > 0 ? strain.effects.join(', ') : '—'} />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Beschreibung</p>
                          <p className="text-xs leading-relaxed text-[var(--foreground)]">{strain.description || '—'}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Quellennotizen</p>
                          <p className="text-xs leading-relaxed text-[var(--foreground)]">{strain.source_notes || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
