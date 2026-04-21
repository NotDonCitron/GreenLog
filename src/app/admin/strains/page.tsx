'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Search, XCircle } from 'lucide-react';

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
  cbd: boolean;
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
  'cbd',
  'terpenes',
  'flavors',
  'effects',
  'image',
  'source',
];

const COMPLETENESS_LABELS: Record<keyof Completeness, string> = {
  name: 'Name',
  slug: 'Slug',
  type: 'Type',
  description: 'Description',
  thc: 'THC',
  cbd: 'CBD',
  terpenes: 'Terpenes',
  flavors: 'Flavors',
  effects: 'Effects',
  image: 'Image',
  source: 'Source',
};

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[95px_1fr] gap-2 text-xs">
      <span className="text-[var(--muted-foreground)] font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-[var(--foreground)] break-words">{value}</span>
    </div>
  );
}

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
    cbd: strain.cbd_min !== null || strain.cbd_max !== null,
    terpenes: Array.isArray(strain.terpenes) && strain.terpenes.length >= 2,
    flavors: Array.isArray(strain.flavors) && strain.flavors.length >= 1,
    effects: Array.isArray(strain.effects) && strain.effects.length >= 1,
    image: !!strain.image_url,
    source: !!strain.primary_source?.trim(),
  };
}

function evaluateStrain(strain: Strain, completeness: Completeness) {
  const completeCount = COMPLETENESS_KEYS.filter((key) => completeness[key]).length;
  const missing = COMPLETENESS_KEYS.filter((key) => !completeness[key]);

  const goodReasons: string[] = [];
  if (completeness.name && completeness.slug) goodReasons.push('Identität eindeutig');
  if (completeness.thc || completeness.cbd) goodReasons.push('Cannabinoid-Werte vorhanden');
  if (completeness.description && completeness.effects) goodReasons.push('Wirkung ist dokumentiert');
  if (completeness.image) goodReasons.push('Bild vorhanden');
  if (completeness.source) goodReasons.push('Quelle dokumentiert');

  const badReasons = missing.slice(0, 4).map((key) => `Fehlt: ${COMPLETENESS_LABELS[key]}`);

  let recommendation: Recommendation = 'needs_review';
  if (completeCount >= 10 && completeness.image && completeness.source && completeness.description) {
    recommendation = 'publish_ready';
  } else if (!completeness.name || !completeness.slug || !completeness.source || completeCount <= 6) {
    recommendation = 'weak_candidate';
  }

  return {
    completeCount,
    missing,
    goodReasons,
    badReasons,
    recommendation,
  };
}

function recommendationUi(recommendation: Recommendation) {
  if (recommendation === 'publish_ready') {
    return {
      label: 'Publish Ready',
      className: 'border-green-500/40 bg-green-500/15 text-green-300',
    };
  }

  if (recommendation === 'weak_candidate') {
    return {
      label: 'Schwach / Nacharbeiten',
      className: 'border-red-500/40 bg-red-500/15 text-red-300',
    };
  }

  return {
    label: 'Needs Review',
    className: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
  };
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
      return {
        strain,
        completeness,
        ...evaluation,
      };
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted-foreground)]" size={28} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={44} />
          <h1 className="text-lg font-bold uppercase tracking-wide text-red-300">Access denied</h1>
          <p className="mt-2 text-sm text-red-200/80">Admin-Zugriff erforderlich.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted-foreground)]" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={44} />
          <p className="text-sm text-red-200">{error}</p>
          <button
            onClick={() => void fetchStrains()}
            className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--card)]/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-[var(--foreground)]">Strain Moderation</h1>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">Klarer Entscheidungs-Feed mit Gründen und sofort sichtbarem Bild</p>
          </div>
          <button
            onClick={() => void fetchStrains()}
            className="self-start rounded-lg border border-[var(--border)]/70 bg-[var(--background)]/40 px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)]/60"
          >
            Aktualisieren
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/40 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Total</p>
            <p className="mt-1 text-xl font-black text-[var(--foreground)]">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-yellow-300">Draft</p>
            <p className="mt-1 text-xl font-black text-yellow-200">{stats.draft}</p>
          </div>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-cyan-300">Review</p>
            <p className="mt-1 text-xl font-black text-cyan-200">{stats.review}</p>
          </div>
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-green-300">Ready</p>
            <p className="mt-1 text-xl font-black text-green-200">{stats.ready}</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-red-300">Schwach</p>
            <p className="mt-1 text-xl font-black text-red-200">{stats.weak}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Suche nach Name, Slug, Source"
              className="w-full rounded-lg border border-[var(--border)]/70 bg-[var(--background)]/40 py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none focus:border-[#2FF801]/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'draft', 'review'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                  statusFilter === status
                    ? 'border-[#2FF801]/60 bg-[#2FF801]/15 text-[#2FF801]'
                    : 'border-[var(--border)]/70 bg-[var(--background)]/40 text-[var(--muted-foreground)]'
                }`}
              >
                {status}
              </button>
            ))}
            {([
              { key: 'all', label: 'Alle Empfehlungen' },
              { key: 'publish_ready', label: 'Publish Ready' },
              { key: 'needs_review', label: 'Needs Review' },
              { key: 'weak_candidate', label: 'Schwach' },
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => setRecommendationFilter(item.key)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  recommendationFilter === item.key
                    ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                    : 'border-[var(--border)]/70 bg-[var(--background)]/40 text-[var(--muted-foreground)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {actionMessage && (
          <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
            {actionMessage}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--card)]/60 p-8 text-center text-sm text-[var(--muted-foreground)]">
          Keine passenden Strains in der Queue.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const {
              strain,
              completeness,
              completeCount,
              missing,
              recommendation,
              goodReasons,
              badReasons,
            } = row;
            const isExpanded = expandedId === strain.id;
            const isRowUpdating = isUpdating === strain.id;
            const recommendationStyle = recommendationUi(recommendation);

            return (
              <div key={strain.id} className="rounded-2xl border border-[var(--border)]/60 bg-[var(--card)]/60 p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_140px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[var(--foreground)] truncate">{strain.name}</h2>
                      <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${recommendationStyle.className}`}>
                        {recommendationStyle.label}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        strain.publication_status === 'review'
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                      }`}>
                        {strain.publication_status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {strain.slug} · {strain.type || '—'} · {strain.primary_source || 'no source'} · {completeCount}/{COMPLETENESS_KEYS.length}
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-green-300 mb-1">Warum gut</p>
                        <p className="text-xs text-green-200">{goodReasons.length > 0 ? goodReasons.join(' · ') : 'Noch keine klaren Pluspunkte.'}</p>
                      </div>
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-red-300 mb-1">Warum problematisch</p>
                        <p className="text-xs text-red-200">{badReasons.length > 0 ? badReasons.join(' · ') : 'Keine kritischen Lücken erkannt.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/30 p-2 h-fit">
                    {strain.image_url ? (
                      <a href={strain.image_url} target="_blank" rel="noopener noreferrer" className="block">
                        {/* Intentional raw img tag for external moderation preview */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={strain.image_url}
                          alt={strain.name}
                          className="w-full rounded-lg border border-[var(--border)]/60 object-cover aspect-square"
                          referrerPolicy="no-referrer"
                        />
                      </a>
                    ) : (
                      <div className="aspect-square rounded-lg border border-dashed border-[var(--border)]/60 grid place-items-center text-xs text-[var(--muted-foreground)]">
                        Kein Bild
                      </div>
                    )}
                    <p className="mt-2 text-[10px] text-[var(--muted-foreground)] text-center">Bild (click zum Öffnen)</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {COMPLETENESS_KEYS.map((key) => {
                    const ok = completeness[key];
                    return (
                      <div
                        key={key}
                        className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 ${
                          ok
                            ? 'border-green-500/30 bg-green-500/10 text-green-300'
                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                        }`}
                      >
                        {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {COMPLETENESS_LABELS[key]}
                      </div>
                    );
                  })}
                </div>

                {missing.length > 0 && (
                  <p className="mt-2 text-xs text-red-300">
                    Fehlt aktuell: {missing.map((key) => COMPLETENESS_LABELS[key]).join(', ')}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : strain.id)}
                    className="rounded-lg border border-[var(--border)]/70 bg-[var(--background)]/40 px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)]/60 flex items-center gap-1"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Weniger' : 'Details'}
                  </button>
                  <button
                    onClick={() => void updateStatus(strain, 'review')}
                    disabled={isRowUpdating || strain.publication_status === 'review'}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
                  >
                    To Review
                  </button>
                  <button
                    onClick={() => void updateStatus(strain, 'published')}
                    disabled={isRowUpdating || recommendation !== 'publish_ready'}
                    className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-200 hover:bg-green-500/20 disabled:opacity-50"
                    title={recommendation !== 'publish_ready' ? 'Zuerst Datenqualität verbessern' : 'Publish'}
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => void updateStatus(strain, 'rejected')}
                    disabled={isRowUpdating}
                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-[var(--border)]/60 pt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/30 p-3 space-y-2">
                      <FieldRow label="Name" value={strain.name || '—'} />
                      <FieldRow label="Slug" value={strain.slug || '—'} />
                      <FieldRow label="Type" value={strain.type || '—'} />
                      <FieldRow label="Source" value={strain.primary_source || '—'} />
                      <FieldRow label="THC" value={formatRange(strain.thc_min, strain.thc_max)} />
                      <FieldRow label="CBD" value={formatRange(strain.cbd_min, strain.cbd_max)} />
                      <FieldRow label="Terpenes" value={Array.isArray(strain.terpenes) && strain.terpenes.length > 0 ? strain.terpenes.join(', ') : '—'} />
                      <FieldRow label="Flavors" value={Array.isArray(strain.flavors) && strain.flavors.length > 0 ? strain.flavors.join(', ') : '—'} />
                      <FieldRow label="Effects" value={Array.isArray(strain.effects) && strain.effects.length > 0 ? strain.effects.join(', ') : '—'} />
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/30 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] mb-1">Description</p>
                        <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap">{strain.description || '—'}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--background)]/30 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] mb-1">Source Notes</p>
                        <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap">{strain.source_notes || '—'}</p>
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
