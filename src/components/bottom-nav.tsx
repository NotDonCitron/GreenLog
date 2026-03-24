"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Home, Leaf, BookMarked, Users, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { FollowRequestsModal } from "@/components/social/follow-requests-modal";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/strains", label: "Strains", icon: Leaf },
  { href: "/collection", label: "Sammlung", icon: BookMarked },
  { href: "/discover", label: "Social", icon: Users, showBadge: true },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!user) {
        setPendingRequestsCount(0);
        return;
      }

      try {
        // Fetch pending requests directly using supabase client
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
    // Poll every 30 seconds
    const interval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#355E3B]/90 backdrop-blur-xl safe-bottom">
        <div className="mx-auto flex h-20 max-w-lg items-center justify-around px-2 relative">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            // Discover with badge (Always a link)
            if (item.showBadge) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] uppercase font-bold tracking-tighter transition-colors ${isActive ? "text-[#2FF801]" : "text-white/40"}`}
                >
                  <div className="relative">
                    <item.icon size={22} className={isActive ? "text-[#2FF801]" : "text-white/40"} />
                    {pendingRequestsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                      </span>
                    )}
                  </div>
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] uppercase font-bold tracking-tighter transition-colors ${isActive ? "text-[#2FF801]" : "text-white/40"
                  }`}
              >
                <item.icon size={22} className={isActive ? "text-[#2FF801]" : "text-white/40"} />
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
