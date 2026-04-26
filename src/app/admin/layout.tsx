'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Camera, ImageOff, Leaf, LayoutDashboard, Radar, Sprout, Loader2, LogOut, Terminal } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/strains', label: 'Strains', icon: Sprout },
  { href: '/admin/scraper', label: 'Scraper', icon: Terminal },
  { href: '/admin/media', label: 'Media', icon: ImageOff },
  { href: '/admin/quality', label: 'Quality', icon: Radar },
  { href: '/admin/placeholders', label: 'Images', icon: Camera },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { loading } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="animate-spin text-[var(--muted-foreground)]" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/50 bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
              <Leaf className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-[var(--foreground)]">GreenLog</span>
            <span className="ml-2 hidden rounded-md border border-[var(--border)]/50 bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] sm:inline-block">
              Admin
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <div className="mx-2 hidden h-4 w-px bg-[var(--border)]/50 sm:block" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
