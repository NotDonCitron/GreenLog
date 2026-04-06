"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Leaf, Building2, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  organization_type: string;
  license_number: string | null;
  status: string;
  logo_url?: string | null;
}

interface MemberOrg extends Organization {
  membership_role?: string;
}

function OrgTypeLabel({ type }: { type: string }) {
  const label = type === "club" ? "Club" : type === "pharmacy" ? "Apotheke" : type;
  return (
    <span className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
      {label}
    </span>
  );
}

function CommunityCard({ org, role }: { org: Organization; role?: string }) {
  return (
    <Link href={`/community/${org.id}`}>
      <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl hover:border-[#00F5FF]/50 transition-all cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--muted)] border border-[var(--border)]/50 flex items-center justify-center shrink-0 overflow-hidden">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
            ) : (
              <Leaf size={20} className="text-[#2FF801]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm truncate text-[var(--foreground)]">{org.name}</p>
            <OrgTypeLabel type={org.organization_type} />
          </div>
          {role && (
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 text-[#00F5FF]">
              {role === "gründer" ? "Gründer" : role === "admin" ? "Admin" : "Member"}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-[var(--muted)] border border-[var(--border)]/50 flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-[var(--muted-foreground)]" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function CommunityPageClient() {
  const { user, memberships } = useAuth();
  const [myOrgs, setMyOrgs] = useState<MemberOrg[]>([]);
  const [otherOrgs, setOtherOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const mountedRef = useRef(true);

  // Wait for client hydration
  useEffect(() => {
    mountedRef.current = true;
    setTimeout(() => setHydrated(true), 0);
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    async function fetchOrganizations() {
      try {
        if (!user) {
          const { data } = await supabase
            .from("organizations")
            .select("id, name, slug, organization_type, license_number, status, logo_url")
            .eq("status", "active")
            .order("name", { ascending: true })
            .limit(50);

          if (cancelled || !mountedRef.current) return;
          setOtherOrgs(data || []);
          setLoading(false);
          return;
        }

        const { data: allOrgs } = await supabase
          .from("organizations")
          .select("id, name, slug, organization_type, license_number, status, logo_url")
          .eq("status", "active")
          .order("name", { ascending: true })
          .limit(50);

        if (cancelled || !mountedRef.current) return;

        const myOrgIds = new Set(memberships.map((m) => m.organization_id));
        const mine: MemberOrg[] = [];
        const others: Organization[] = [];

        for (const org of allOrgs || []) {
          if (myOrgIds.has(org.id)) {
            const membership = memberships.find((m) => m.organization_id === org.id);
            mine.push({ ...org, membership_role: membership?.role });
          } else {
            others.push(org);
          }
        }

        if (!cancelled && mountedRef.current) {
          setMyOrgs(mine);
          setOtherOrgs(others);
          setLoading(false);
        }
      } catch {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    void fetchOrganizations();
    return () => { cancelled = true; };
  }, [user, memberships, hydrated]);

  return (
    <>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 relative z-10">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
          Communities
        </h1>
      </header>

      <div className="px-6 space-y-6 mt-4 relative z-10 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#00F5FF]" />
          </div>
        ) : (
          <>
            {/* My Communities */}
            {myOrgs.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                  Meine Communities
                </h2>
                <div className="space-y-3">
                  {myOrgs.map((org) => (
                    <CommunityCard key={org.id} org={org} role={org.membership_role} />
                  ))}
                </div>
              </section>
            )}

            {/* Create new community CTA — only if user has no community yet */}
            {myOrgs.length === 0 && (
              <Link href="/community/new">
                <Card className="bg-[#2FF801]/10 border border-[#2FF801]/30 p-4 rounded-3xl hover:bg-[#2FF801]/20 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2FF801]/20 border border-[#2FF801]/40 flex items-center justify-center shrink-0">
                      <Plus size={16} className="text-[#2FF801]" />
                    </div>
                    <p className="font-black text-sm text-[#2FF801]">Community erstellen</p>
                  </div>
                </Card>
              </Link>
            )}

            {/* Other Communities */}
            {otherOrgs.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                  {myOrgs.length > 0 ? "Andere Communities" : "Communities"}
                </h2>
                <div className="space-y-3">
                  {otherOrgs.map((org) => (
                    <CommunityCard key={org.id} org={org} />
                  ))}
                </div>
              </section>
            )}

            {myOrgs.length === 0 && otherOrgs.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[var(--card)] border border-[var(--border)]/50 flex items-center justify-center mx-auto">
                  <Building2 size={24} className="text-[#484849]" />
                </div>
                <p className="text-[var(--muted-foreground)] text-sm">Es gibt noch keine Communities.</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </>
  );
}
