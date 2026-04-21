import Link from 'next/link';
import { Sprout, BarChart3, Users, Settings } from 'lucide-react';

const CARDS = [
  {
    href: '/admin/strains',
    icon: Sprout,
    title: 'Strain Moderation',
    description: 'Neue Sorten prüfen, bewerten und veröffentlichen',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    href: '/admin/seed',
    icon: BarChart3,
    title: 'Seed / Import',
    description: 'Daten importieren und Seeds ausführen',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Verwaltung und Moderation der GreenLog-Plattform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-[var(--border)]/50 bg-[var(--card)]/50 p-5 transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--card)]"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                <Icon size={20} className={card.color} />
              </div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">{card.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{card.description}</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)] opacity-0 transition-opacity group-hover:opacity-100">
                Öffnen <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
