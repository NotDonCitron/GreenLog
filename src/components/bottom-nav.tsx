"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Leaf, BookMarked, Sprout, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/strains", label: "Strains", icon: Leaf },
  { href: "/collection", label: "Sammlung", icon: BookMarked },
  { href: "/grows", label: "Grows", icon: Sprout },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-surface border-t border-[var(--border)]/50 safe-bottom" role="navigation" aria-label="Main navigation">
      <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-around px-2 relative">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] uppercase font-bold tracking-tight transition-all active:scale-95 ${isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"}`}
              aria-label={item.label}
            >
              <div className="relative">
                <item.icon size={22} className={isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00F5FF]" />
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
