"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Leaf, Sprout, User, ScanLine } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/strains", label: "Strains", icon: Leaf },
  { href: "/scanner", label: "Scanner", icon: ScanLine, isCenter: true },
  { href: "/grows", label: "Grows", icon: Sprout },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#0e0e0f]/90 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex h-20 max-w-lg items-center justify-around px-2 relative">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-10"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                  isActive 
                    ? "bg-[#00F5FF] text-black scale-110 shadow-[#00F5FF]/20" 
                    : "bg-[#1a191b] text-[#00F5FF] border border-white/10"
                }`}>
                  <item.icon size={28} />
                </div>
                <span className={`text-[10px] mt-2 font-bold uppercase tracking-tighter ${isActive ? "text-[#00F5FF]" : "text-white/40"}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] uppercase font-bold tracking-tighter transition-colors ${
                isActive ? "text-[#2FF801]" : "text-white/40"
              }`}
            >
              <item.icon size={22} className={isActive ? "text-[#2FF801]" : "text-white/40"} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
