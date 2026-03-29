"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Home, Leaf, BookMarked, Users, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { FollowRequestsModal } from "@/components/social/follow-requests-modal";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/strains", label: "Strains", icon: Leaf },
  { href: "/collection", label: "Sammlung", icon: BookMarked },
  { href: "/feed", label: "Social", icon: Users, showBadge: true },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  const handleBadgeClick = () => {
    if (pendingRequestsCount > 0) {
      setShowRequestsModal(true);
    } else {
      router.push("/feed");
    }
  };

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!user) {
        setPendingRequestsCount(0);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("follow_requests")
          .select("id")
          .eq("target_id", user.id)
          .eq("status", "pending");

        if (!error && data) {
          setPendingRequestsCount(data.length);
        }
      } catch (err) {
        console.error("Error fetching pending requests:", err);
      }
    };

    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-surface border-t border-[var(--border)]/50 safe-bottom">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-around px-2 relative">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            if (item.showBadge) {
              return (
                <button
                  key={item.href}
                  onClick={handleBadgeClick}
                  className={`flex flex-1 flex-col items-center gap-1 py-1 text-[9px] uppercase font-bold tracking-tight transition-all active:scale-95 ${isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"}`}
                >
                  <div className="relative">
                    <item.icon size={22} className={isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"} />
                    {pendingRequestsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#ff716c] text-[var(--foreground)] text-[10px] font-bold rounded-full flex items-center justify-center">
                        {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00F5FF]" />
                    )}
                  </div>
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-1 text-[9px] uppercase font-bold tracking-tight transition-all active:scale-95 ${isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"
                  }`}
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

      <FollowRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
      />
    </>
  );
}
