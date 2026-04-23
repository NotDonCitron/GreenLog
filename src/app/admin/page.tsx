'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Camera,
  DatabaseZap,
  Eye,
  ImageOff,
  Layers3,
  Loader2,
  Radar,
  ShieldAlert,
  Sparkles,
  Sprout,
  Wand2,
} from 'lucide-react';

import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { getStrainPublicationSnapshot } from '@/lib/strains/publication';
import { getStrainSourcePolicy, type StrainSourceTier } from '@/lib/strains/source-policy';
import type { Strain, StrainPublicationStatus } from '@/lib/types';

type AdminStrain = Pick<
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
  | 'created_at'
>;

type EnrichedStrain = {
  strain: AdminStrain;
  qualityScore: number;
  canPublish: boolean;
  missing: string[];
  sourceTier: StrainSourceTier;
  sourceLabel: string;
  hasPlaceholder: boolean;
  hasImage: boolean;
  duplicateKey: string;
};

const MISSING_LABELS: Record<string, string> = {
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

const QUICK_LINKS = [
  {
    href: '/admin/strains',
    icon: Sprout,
    title: 'Strain Moderation',
    description: 'Entscheidungen treffen und veröffentlichen',
    color: 'text-emerald-300',
    bg: 'bg-emerald-400/10',
  },
  {
    href: '/admin/quality',
    icon: Radar,
    title: 'Quality Radar',
    description: 'Katalogqualität und Gate-Lücken prüfen',
    color: 'text-lime-300',
    bg: 'bg-lime-400/10',
  },
  {
    href: '/admin/placeholders',
    icon: Camera,
    title: 'Placeholder Queue',
    description: 'Sorten mit Platzhalterbildern priorisieren',
    color: 'text-orange-300',
    bg: 'bg-orange-400/10',
  },
  {
    href: '/admin/media',
    icon: ImageOff,
    title: 'Media Repair',
    description: 'Bild-URLs dry-runnen und bereinigen',
    color: 'text-amber-300',
    bg: 'bg-amber-400/10',
  },
  {
    href: '/admin/seed',
    icon: DatabaseZap,
    title: 'Seed / Import',
    description: 'Bestehende Import-Werkzeuge öffnen',
    color: 'text-sky-300',
    bg: 'bg-sky-400/10',
  },
];

function normalizeDuplicateKey(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(auto|automatic|fem|feminized|official|regular|reg|cbd|thc)\b/g, '')
    .replace(/#[0-9]+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isPlaceholder(strain: AdminStrain) {
  return `${strain.image_url ?? ''} ${strain.canonical_image_path ?? ''}`.toLowerCase().includes('placeholder');
}

function hasImage(strain: AdminStrain) {
  return Boolean(strain.image_url?.trim() && strain.canonical_image_path?.trim());
}

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
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
  const classes = {
    neutral: 'border-white/10 bg-white/[0.06] text-white',
    good: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
    warn: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    bad: 'border-red-300/20 bg-red-300/10 text-red-100',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60">{label}</p>
      <p className="mt-3 text-xs leading-5 opacity-75">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]/60 p-5 shadow-lg shadow-black/5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">{title}</h2>
        </div>
        <Icon className="text-[var(--primary)]" size={22} />
      </div>
      {children}
    </section>
  );
}

function MiniStrainRow({ item, note }: { item: EnrichedStrain; note?: string }) {
  return (
    <Link
      href={`/admin/strains?search=${encodeURIComponent(item.strain.name)}&scope=all`}
      className="block rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/40 p-3 transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--muted)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.strain.name}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {item.strain.publication_status} · {item.sourceLabel} · {item.qualityScore}%
          </p>
        </div>
        <ArrowUpRight className="shrink-0 text-[var(--muted-foreground)]" size={14} />
      </div>
      {note && <p className="mt-2 text-xs text-[var(--muted-foreground)]">{note}</p>}
    </Link>
  );
}

function ImportInboxRow({ item }: { item: EnrichedStrain }) {
  return (
    <Link
      href={`/admin/strains?search=${encodeURIComponent(item.strain.name)}&scope=all`}
      className="block rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/40 p-3 transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--muted)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.strain.name}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {item.strain.publication_status} · {item.sourceLabel} · {item.qualityScore}%
          </p>
        </div>
        <ArrowUpRight className="shrink-0 text-[var(--muted-foreground)]" size={14} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.missing.length === 0 ? (
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            Gate erfüllt
          </span>
        ) : (
          item.missing.slice(0, 6).map((field) => (
            <span key={field} className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
              {MISSING_LABELS[field] ?? field}
            </span>
          ))
        )}
        {item.missing.length > 6 && (
          <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            +{item.missing.length - 6}
          </span>
        )}
        {item.hasPlaceholder && (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            Placeholder
          </span>
        )}
      </div>
    </Link>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/40 p-3">
      <p className="text-xl font-black text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}

export default function AdminCommandCenterPage() {
  const { user, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<AdminStrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminIds = useMemo(
    () => (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
    [],
  );
  const isAdmin = !!user && adminIds.includes(user.id);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from('strains')
        .select(
          'id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, flavors, effects, image_url, canonical_image_path, publication_status, primary_source, source_notes, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(5000);

      if (loadError) {
        setError(loadError.message);
        setStrains([]);
      } else {
        setStrains((data as AdminStrain[]) ?? []);
      }

      setLoading(false);
    }

    void load();
  }, [authLoading, isAdmin]);

  const enriched = useMemo<EnrichedStrain[]>(() => {
    return strains.map((strain) => {
      const snapshot = getStrainPublicationSnapshot(strain);
      const source = getStrainSourcePolicy(strain.primary_source);

      return {
        strain,
        qualityScore: snapshot.qualityScore,
        canPublish: snapshot.canPublish,
        missing: snapshot.missing,
        sourceTier: source.tier,
        sourceLabel: source.label,
        hasPlaceholder: isPlaceholder(strain),
        hasImage: hasImage(strain),
        duplicateKey: normalizeDuplicateKey(strain.name),
      };
    });
  }, [strains]);

  const insights = useMemo(() => {
    const total = enriched.length;
    const published = enriched.filter((item) => item.strain.publication_status === 'published').length;
    const open = enriched.filter((item) => ['draft', 'review'].includes(item.strain.publication_status || '')).length;
    const ready = enriched.filter((item) => item.canPublish && item.strain.publication_status !== 'published').length;
    const placeholders = enriched.filter((item) => item.hasPlaceholder).length;
    const publicProblems = enriched.filter(
      (item) =>
        item.strain.publication_status === 'published' &&
        (item.hasPlaceholder || !item.hasImage || item.missing.length > 0 || item.sourceTier === 'review'),
    );

    const duplicateGroups = Object.values(groupBy(enriched, (item) => item.duplicateKey))
      .filter((group) => group.length > 1 && group[0]?.duplicateKey.length > 2)
      .sort((a, b) => b.length - a.length || Math.max(...b.map((item) => item.qualityScore)) - Math.max(...a.map((item) => item.qualityScore)));

    const sourceGroups = Object.entries(groupBy(enriched, (item) => item.sourceLabel))
      .map(([label, items]) => ({
        label,
        total: items.length,
        published: items.filter((item) => item.strain.publication_status === 'published').length,
        placeholders: items.filter((item) => item.hasPlaceholder).length,
        avgQuality: Math.round(items.reduce((sum, item) => sum + item.qualityScore, 0) / Math.max(items.length, 1)),
        tier: items[0]?.sourceTier ?? 'review',
      }))
      .sort((a, b) => b.total - a.total);

    const importInbox = enriched
      .filter((item) => item.strain.publication_status !== 'published')
      .sort((a, b) => {
        const dateA = a.strain.created_at ? new Date(a.strain.created_at).getTime() : 0;
        const dateB = b.strain.created_at ? new Date(b.strain.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 8);

    const worklists = {
      publishReady: enriched
        .filter((item) => item.canPublish && item.strain.publication_status !== 'published')
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, 5),
      worstPlaceholders: enriched
        .filter((item) => item.hasPlaceholder)
        .sort((a, b) => {
          const statusWeight = (status?: StrainPublicationStatus) => (status === 'published' ? 2 : status === 'review' ? 1 : 0);
          return statusWeight(b.strain.publication_status) - statusWeight(a.strain.publication_status) || b.qualityScore - a.qualityScore;
        })
        .slice(0, 5),
      publishedIssues: publicProblems.slice(0, 5),
      duplicateSuspects: duplicateGroups.slice(0, 5),
    };

    return { total, published, open, ready, placeholders, publicProblems, duplicateGroups, sourceGroups, importInbox, worklists };
  }, [enriched]);

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
          <p className="mt-2 text-sm text-red-200/70">Dieses Command Center darf nur von App-Admins genutzt werden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-300/15 bg-[radial-gradient(circle_at_12%_15%,rgba(16,185,129,0.22),transparent_30%),radial-gradient(circle_at_82%_5%,rgba(190,242,100,0.16),transparent_26%),linear-gradient(135deg,rgba(6,12,10,0.98),rgba(15,23,42,0.96))] p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100">
              <Sparkles size={12} />
              Admin Command Center
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Was braucht als Nächstes deine Aufmerksamkeit?
            </h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50/70">
              Ein read-only Überblick für Imports, Dubletten, Public-Katalog, Quellenvertrauen, Worklists und Experience-Monitoring.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[520px] sm:grid-cols-5">
            <StatCard label="Total" value={insights.total} detail="Strains geladen" />
            <StatCard label="Public" value={insights.published} detail={`${pct(insights.published, insights.total)}% sichtbar`} tone="good" />
            <StatCard label="Open" value={insights.open} detail="Draft + Review" tone="warn" />
            <StatCard label="Ready" value={insights.ready} detail="Offen & publish-ready" tone="good" />
            <StatCard label="Issues" value={insights.publicProblems.length} detail="Published mit Risiko" tone={insights.publicProblems.length ? 'bad' : 'good'} />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/50 p-4 transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--card)]"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${link.bg}`}>
                <Icon size={20} className={link.color} />
              </div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{link.title}</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{link.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Duplicate Queue" eyebrow="Dubletten-Verdacht" icon={Layers3}>
          {insights.duplicateGroups.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Keine offensichtlichen Namens-Dubletten gefunden.</p>
          ) : (
            <div className="space-y-3">
              {insights.duplicateGroups.slice(0, 6).map((group) => (
                <div key={group[0].duplicateKey} className="rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{group[0].duplicateKey}</p>
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">{group.length} Treffer</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.slice(0, 5).map((item) => (
                      <Link
                        key={item.strain.id}
                        href={`/admin/strains?search=${encodeURIComponent(item.strain.name)}&scope=all`}
                        className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--primary)]/10"
                      >
                        {item.strain.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Import Inbox" eyebrow="Neue offene Kandidaten" icon={Boxes}>
          <div className="space-y-2">
            {insights.importInbox.map((item) => (
              <ImportInboxRow key={item.strain.id} item={item} />
            ))}
          </div>
        </Panel>

        <Panel title="Public Catalog Preview" eyebrow="Was Nutzer sehen" icon={Eye}>
          <div className="grid gap-3 sm:grid-cols-4">
            <CountPill label="Published" value={insights.published} />
            <CountPill label="Hidden" value={Math.max(insights.total - insights.published, 0)} />
            <CountPill label="Placeholder" value={enriched.filter((item) => item.strain.publication_status === 'published' && item.hasPlaceholder).length} />
            <CountPill label="Missing Gate" value={insights.publicProblems.length} />
          </div>
          <div className="mt-4 space-y-2">
            {insights.publicProblems.slice(0, 4).map((item) => (
              <MiniStrainRow key={item.strain.id} item={item} note="Published, aber mit sichtbarem Qualitätsrisiko." />
            ))}
            {insights.publicProblems.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">Keine veröffentlichten Strains mit offensichtlichem Risiko gefunden.</p>
            )}
          </div>
        </Panel>

        <Panel title="Source Trust Board" eyebrow="Quellen bewerten" icon={BadgeCheck}>
          <div className="space-y-3">
            {insights.sourceGroups.slice(0, 6).map((source) => (
              <div key={source.label} className="rounded-xl border border-[var(--border)]/40 bg-[var(--background)]/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{source.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {source.tier} · {source.published}/{source.total} published · {source.placeholders} Placeholder
                    </p>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-sm font-black text-emerald-300">{source.avgQuality}%</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="One-Click Worklists" eyebrow="Direkt anfangen" icon={Wand2}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">5 beste Publish-Kandidaten</p>
              {insights.worklists.publishReady.map((item) => <MiniStrainRow key={item.strain.id} item={item} />)}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">5 wichtigste Placeholder</p>
              {insights.worklists.worstPlaceholders.map((item) => <MiniStrainRow key={item.strain.id} item={item} />)}
            </div>
          </div>
        </Panel>

        <Panel title="Broken Public Experience Monitor" eyebrow="Pre-deploy Blick" icon={ShieldAlert}>
          <div className="grid gap-3 sm:grid-cols-3">
            <CountPill label="Public Issues" value={insights.publicProblems.length} />
            <CountPill label="Review Sources" value={enriched.filter((item) => item.sourceTier === 'review').length} />
            <CountPill label="No Image" value={enriched.filter((item) => !item.hasImage).length} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
            Monitor ist read-only: Er markiert veröffentlichte Strains mit Placeholdern, fehlenden Gate-Feldern, Review-Quellen oder fehlenden Bildern.
          </p>
        </Panel>
      </div>
    </div>
  );
}
