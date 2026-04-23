'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import {
  getStrainPublicationSnapshot,
  type StrainPublicationCandidate,
  type StrainPublicationRequirement,
} from '@/lib/strains/publication';
import { detectSourceWarnings, getStrainSourcePolicy } from '@/lib/strains/source-policy';
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
  Undo2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Trash2,
  Send,
} from 'lucide-react';

interface Strain extends StrainPublicationCandidate {
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
  created_at?: string;
}

type Completeness = Record<StrainPublicationRequirement, boolean>;

type Recommendation = 'publish_ready' | 'needs_review' | 'weak_candidate';

type SortKey = 'name' | 'score' | 'source' | 'status' | 'created';
type SortDir = 'asc' | 'desc';

interface UndoAction {
  id: string;
  strainId: string;
  strainName: string;
  previousStatus: string;
  newStatus: string;
  timer: ReturnType<typeof setTimeout>;
}

const COMPLETENESS_KEYS: StrainPublicationRequirement[] = [
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

const PAGE_SIZE = 50;

function formatRange(min: number | null, max: number | null) {
  if (min !== null && max !== null) return `${min}–${max}%`;
  if (min !== null) return `min ${min}%`;
  if (max !== null) return `max ${max}%`;
  return '—';
}

function getCompleteness(strain: Strain): Completeness {
  const snapshot = getStrainPublicationSnapshot(strain);
  return Object.fromEntries(
    COMPLETENESS_KEYS.map((key) => [key, !snapshot.missing.includes(key)])
  ) as Completeness;
}

function evaluateStrain(strain: Strain, completeness: Completeness) {
  const publication = getStrainPublicationSnapshot(strain);
  const completeCount = COMPLETENESS_KEYS.length - publication.missing.length;
  const missing = publication.missing;
  const sourcePolicy = getStrainSourcePolicy(strain.primary_source);
  const sourceWarnings = detectSourceWarnings({
    primarySource: strain.primary_source,
    imageUrl: strain.image_url,
    sourceNotes: strain.source_notes,
  });

  const goodReasons: string[] = [];
  if (completeness.name && completeness.slug) goodReasons.push('Identität eindeutig');
  if (completeness.thc) goodReasons.push('Cannabinoid-Werte vorhanden');
  if (completeness.description && completeness.effects) goodReasons.push('Wirkung dokumentiert');
  if (completeness.image) goodReasons.push('Bild vorhanden');
  if (completeness.source) goodReasons.push('Quelle dokumentiert');

  const badReasons = missing.slice(0, 4).map((key) => {
    const labels: Record<string, string> = {
      name: 'Name', slug: 'Slug', type: 'Type', description: 'Beschreibung',
      thc: 'THC', cbd: 'CBD', terpenes: 'Terpene', flavors: 'Aromen', effects: 'Effekte',
      image: 'Bild', source: 'Quelle',
    };
    return labels[key] || key;
  });

  let recommendation: Recommendation = 'needs_review';
  if (publication.canPublish) {
    recommendation = 'publish_ready';
  } else if (!completeness.name || !completeness.slug || !completeness.source || completeCount <= 6) {
    recommendation = 'weak_candidate';
  }

  if (!publication.canPublish && sourceWarnings.length > 1) {
    recommendation = 'weak_candidate';
  }

  return { completeCount, missing, goodReasons, badReasons, recommendation, sourcePolicy, sourceWarnings };
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

function UndoToast({ actions, onUndo, onDismiss }: { actions: UndoAction[]; onUndo: (id: string) => void; onDismiss: (id: string) => void }) {
  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {actions.map((action) => {
        const actionLabel = action.newStatus === 'published' ? 'veröffentlicht' : action.newStatus === 'rejected' ? 'abgelehnt' : 'auf Review gesetzt';
        return (
          <div
            key={action.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)]/50 bg-[var(--card)] px-4 py-3 shadow-xl backdrop-blur-sm animate-in slide-in-from-right"
          >
            <span className="text-sm text-[var(--foreground)]">
              <strong>{action.strainName}</strong> wurde {actionLabel}
            </span>
            <button
              onClick={() => onUndo(action.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25"
            >
              <Undo2 size={12} />
              Rückgängig
            </button>
            <button
              onClick={() => onDismiss(action.id)}
              className="rounded-lg p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort }: { label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir; onSort: (key: SortKey) => void }) {
  const isActive = currentKey === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
        isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      {label}
      {isActive ? (
        currentDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
      ) : (
        <ArrowUpDown size={10} className="opacity-40" />
      )}
    </button>
  );
}

export default function AdminStrainsPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'review'>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | Recommendation>('all');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoActions, setUndoActions] = useState<UndoAction[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const undoCounterRef = useRef(0);

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

  const addUndo = useCallback((strainId: string, strainName: string, previousStatus: string, newStatus: string) => {
    const id = `undo-${++undoCounterRef.current}`;
    const timer = setTimeout(() => {
      setUndoActions((prev) => prev.filter((a) => a.id !== id));
    }, 8000);
    const action: UndoAction = { id, strainId, strainName, previousStatus, newStatus, timer };
    setUndoActions((prev) => [...prev, action]);
  }, []);

  const handleUndo = useCallback(async (undoId: string) => {
    const action = undoActions.find((a) => a.id === undoId);
    if (!action) return;

    clearTimeout(action.timer);
    setUndoActions((prev) => prev.filter((a) => a.id !== undoId));

    setIsUpdating((prev) => new Set(prev).add(action.strainId));

    try {
      const response = await fetch(`/api/admin/strains/${action.strainId}/publication`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ publication_status: action.previousStatus }),
      });

      if (!response.ok) {
        setError('Undo fehlgeschlagen. Bitte manuell prüfen.');
      }
    } catch {
      setError('Undo fehlgeschlagen. Netzwerkfehler.');
    }

    setIsUpdating((prev) => {
      const next = new Set(prev);
      next.delete(action.strainId);
      return next;
    });

    await fetchStrains();
  }, [undoActions, session?.access_token]);

  const dismissUndo = useCallback((undoId: string) => {
    const action = undoActions.find((a) => a.id === undoId);
    if (action) clearTimeout(action.timer);
    setUndoActions((prev) => prev.filter((a) => a.id !== undoId));
  }, [undoActions]);

  const updateStatus = async (strain: Strain, status: 'review' | 'published' | 'rejected') => {
    if (!session?.access_token) {
      setError('Session fehlt. Bitte neu einloggen.');
      return;
    }

    const previousStatus = strain.publication_status;
    setIsUpdating((prev) => new Set(prev).add(strain.id));
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
      setIsUpdating((prev) => {
        const next = new Set(prev);
        next.delete(strain.id);
        return next;
      });
      return;
    }

    addUndo(strain.id, strain.name, previousStatus, status);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(strain.id);
      return next;
    });

    await fetchStrains();
    setIsUpdating((prev) => {
      const next = new Set(prev);
      next.delete(strain.id);
      return next;
    });
  };

  const bulkUpdate = async (status: 'review' | 'published' | 'rejected') => {
    if (!session?.access_token || selectedIds.size === 0) return;

    setBulkLoading(true);
    setError(null);

    const ids = Array.from(selectedIds);
    const prevMap = new Map<string, { name: string; status: string }>();
    strains.forEach((s) => {
      if (selectedIds.has(s.id)) prevMap.set(s.id, { name: s.name, status: s.publication_status });
    });

    try {
      const response = await fetch('/api/admin/strains/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids, publication_status: status }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error?.message || 'Bulk-Update fehlgeschlagen.');
        setBulkLoading(false);
        return;
      }

      const { failed } = payload.data ?? payload;

      ids.forEach((id) => {
        const prev = prevMap.get(id);
        if (prev) addUndo(id, prev.name, prev.status, status);
      });

      if (failed > 0) {
        setError(`${failed} von ${ids.length} Sorten konnten nicht aktualisiert werden.`);
      }
    } catch {
      setError('Bulk-Update fehlgeschlagen. Netzwerkfehler.');
    }

    setSelectedIds(new Set());
    await fetchStrains();
    setBulkLoading(false);
  };

  const enriched = useMemo(() => {
    return strains.map((strain) => {
      const completeness = getCompleteness(strain);
      const evaluation = evaluateStrain(strain, completeness);
      return { strain, completeness, ...evaluation };
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

  const sorted = useMemo(() => {
    const priority: Record<Recommendation, number> = {
      publish_ready: 0,
      needs_review: 1,
      weak_candidate: 2,
    };

    return [...filtered].sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case 'name':
          cmp = a.strain.name.localeCompare(b.strain.name);
          break;
        case 'score':
          cmp = a.completeCount - b.completeCount;
          break;
        case 'source':
          cmp = (a.strain.primary_source || '').localeCompare(b.strain.primary_source || '');
          break;
        case 'status':
          cmp = a.strain.publication_status.localeCompare(b.strain.publication_status);
          break;
        case 'created':
          cmp = (a.strain.created_at || '').localeCompare(b.strain.created_at || '');
          break;
        default:
          cmp = priority[a.recommendation] - priority[b.recommendation];
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = useMemo(() => {
    return sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [sorted, page]);

  const stats = useMemo(() => {
    return {
      total: enriched.length,
      draft: enriched.filter((item) => item.strain.publication_status === 'draft').length,
      review: enriched.filter((item) => item.strain.publication_status === 'review').length,
      ready: enriched.filter((item) => item.recommendation === 'publish_ready').length,
      weak: enriched.filter((item) => item.recommendation === 'weak_candidate').length,
    };
  }, [enriched]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'source' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paged.map((r) => r.strain.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const allPageSelected = paged.length > 0 && paged.every((r) => selectedIds.has(r.strain.id));
  const somePageSelected = paged.some((r) => selectedIds.has(r.strain.id)) && !allPageSelected;

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

  if (error && strains.length === 0) {
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
      <UndoToast actions={undoActions} onUndo={handleUndo} onDismiss={dismissUndo} />

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

      {/* Filters + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
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
              onClick={() => { setStatusFilter(item.key); setPage(0); }}
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
              onClick={() => { setRecommendationFilter(item.key); setPage(0); }}
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

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {selectedIds.size} ausgewählt
          </span>
          <div className="h-4 w-px bg-[var(--border)]/50" />
          <button
            onClick={() => void bulkUpdate('review')}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-40"
          >
            <Eye size={12} />
            Zur Prüfung
          </button>
          <button
            onClick={() => void bulkUpdate('published')}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
          >
            <Send size={12} />
            Veröffentlichen
          </button>
          <button
            onClick={() => void bulkUpdate('rejected')}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40"
          >
            <Trash2 size={12} />
            Ablehnen
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* Error message */}
      {error && strains.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Sort headers */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)]/30 bg-[var(--card)]/30 px-4 py-2">
        <div className="w-6" />
        <SortHeader label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <span className="text-[var(--border)]/50">·</span>
        <SortHeader label="Score" sortKey="score" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <span className="text-[var(--border)]/50">·</span>
        <SortHeader label="Quelle" sortKey="source" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <span className="text-[var(--border)]/50">·</span>
        <SortHeader label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <span className="hidden sm:inline text-[var(--border)]/50">·</span>
        <SortHeader label="Erstellt" sortKey="created" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <span className="ml-auto text-xs text-[var(--muted-foreground)]">
          {sorted.length} Ergebnis{sorted.length !== 1 ? 'se' : ''}
        </span>
      </div>

      {/* Strain list */}
      {paged.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/50 p-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Keine passenden Strains gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all row */}
          <div className="flex items-center gap-3 rounded-lg px-4 py-1.5">
            <button
              onClick={toggleSelectAll}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {allPageSelected ? (
                <CheckSquare size={16} className="text-[var(--primary)]" />
              ) : somePageSelected ? (
                <div className="relative">
                  <Square size={16} className="text-[var(--primary)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-1.5 w-2.5 rounded-sm bg-[var(--primary)]" />
                  </div>
                </div>
              ) : (
                <Square size={16} />
              )}
            </button>
            <span className="text-xs text-[var(--muted-foreground)]">
              Alle auf dieser Seite {allPageSelected ? 'abwählen' : 'auswählen'}
            </span>
          </div>

          {paged.map((row) => {
            const { strain, completeness, completeCount, recommendation, badReasons, sourcePolicy, sourceWarnings } = row;
            const isExpanded = expandedId === strain.id;
            const isRowUpdating = isUpdating.has(strain.id);
            const isSelected = selectedIds.has(strain.id);

            return (
              <div
                key={strain.id}
                className={`group rounded-xl border bg-[var(--card)]/50 transition-colors hover:bg-[var(--card)] ${
                  isExpanded ? 'border-[var(--primary)]/30' : isSelected ? 'border-[var(--primary)]/20' : 'border-[var(--border)]/50'
                }`}
              >
                {/* Main row */}
                <div className="flex items-start gap-3 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(strain.id)}
                    className="mt-1 shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-[var(--primary)]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>

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
                          {isRowUpdating ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                          Zur Prüfung
                        </button>
                        <button
                          onClick={() => void updateStatus(strain, 'published')}
                          disabled={isRowUpdating || recommendation !== 'publish_ready'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
                          title={recommendation !== 'publish_ready' ? 'Zuerst Datenqualität verbessern' : 'Veröffentlichen'}
                        >
                          {isRowUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Veröffentlichen
                        </button>
                        <button
                          onClick={() => void updateStatus(strain, 'rejected')}
                          disabled={isRowUpdating}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                          title="Sorte ablehnen und aus der Warteschlange entfernen"
                        >
                          {isRowUpdating ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
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
                          thc: 'THC', cbd: 'CBD', terpenes: 'Terpene', flavors: 'Aromen', effects: 'Effekte',
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/50 px-4 py-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            Seite {page + 1} von {totalPages} · {sorted.length} Sorten
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronLeft size={14} />
              <ChevronLeft size={14} className="-ml-2.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronRight size={14} />
              <ChevronRight size={14} className="-ml-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
