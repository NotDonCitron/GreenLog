"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import {
  Leaf,
  Users,
  Mail,
  Settings,
  Loader2,
  Building2,
  Crown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ActivityFeed } from "@/components/community/activity-feed";
import { OrgInfoCard } from "@/components/community/org-info-card";
import { OrgStats } from "@/lib/types";
import { useState, useEffect } from "react";

export default function CommunityPage() {
  const { user, activeOrganization, session } = useAuth();
  const router = useRouter();

  const [orgStats, setOrgStats] = useState<OrgStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[#355E3B] text-white pb-32">
        <header className="p-8 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            Community
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            Community Hub
          </h1>
        </header>

        <div className="px-8 space-y-6 mt-4">
          <Card className="bg-[#1e3a24] border-white/10 p-8 rounded-3xl text-center space-y-4">
            <Building2 size={48} className="mx-auto text-white/20" />
            <div>
              <p className="text-lg font-black text-white">Du bist noch in keiner Organisation</p>
              <p className="text-sm text-white/40 mt-2">
                Erstelle oder trete einer Organisation bei, um die Community-Funktionen zu nutzen.
              </p>
            </div>
            <div className="pt-4 space-y-3">
              <Link
                href="/profile"
                className="block w-full h-12 bg-[#00F5FF] hover:bg-[#00F5FF]/80 text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center"
              >
                Organisation erstellen oder beitreten
              </Link>
            </div>
          </Card>
        </div>

        <BottomNav />
      </main>
    );
  }

  const isAdmin = activeOrganization.role === "owner" || activeOrganization.role === "admin";
  const orgName = activeOrganization.organizations?.name || "Unbekannte Organisation";
  const orgType = activeOrganization.organizations?.organization_type;
  const orgTypeLabel = orgType === "club" ? "Club" : orgType === "pharmacy" ? "Apotheke" : orgType;

  useEffect(() => {
    async function fetchStats() {
      if (!activeOrganization || !session?.access_token) return;

      try {
        const res = await fetch(
          `/api/organizations/${activeOrganization.organization_id}/stats`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setOrgStats(data);
        }
      } catch (e) {
        console.error("Failed to load org stats", e);
      } finally {
        setIsLoadingStats(false);
      }
    }

    void fetchStats();
  }, [activeOrganization, session?.access_token]);

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
          {orgName}
        </p>
        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
          Community Hub
        </h1>
      </header>

      <div className="px-8 space-y-6 mt-4">
        {/* Org Info Card */}
        <OrgInfoCard
          orgName={orgName}
          orgType={orgType ?? null}
          isAdmin={isAdmin}
          stats={orgStats ?? { memberCount: 0, strainCount: 0, newestStrain: null }}
        />

        {/* Activity Feed */}
        <div className="mt-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 px-1">
            Letzte Aktivitäten
          </p>
          <Card className="bg-[#1e3a24] border-white/10 p-4 rounded-3xl">
            <ActivityFeed organizationId={activeOrganization.organization_id} />
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 gap-3">
          {/* Unsere Sorten - All members */}
          <Link href="/strains?tab=org">
            <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl hover:bg-[#243d2a] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center shrink-0">
                  <Leaf size={20} className="text-[#2FF801]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm">Unsere Sorten</p>
                  <p className="text-[10px] text-white/40">Alle Strains deiner Organisation</p>
                </div>
              </div>
            </Card>
          </Link>

          {/* Mitglieder - All members */}
          <Link href="/settings/organization/members">
            <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl hover:bg-[#243d2a] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
                  <Users size={20} className="text-[#00F5FF]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm">Mitglieder</p>
                  <p className="text-[10px] text-white/40">Alle Mitglieder der Organisation</p>
                </div>
              </div>
            </Card>
          </Link>

          {/* Einladungen - Admin only */}
          {isAdmin && (
            <Link href="/settings/organization/invites">
              <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl hover:bg-[#243d2a] transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Mail size={20} className="text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm">Einladungen</p>
                    <p className="text-[10px] text-white/40">Neue Mitglieder einladen</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {/* Einstellungen - Admin only */}
          {isAdmin && (
            <Link href="/settings/organization">
              <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl hover:bg-[#243d2a] transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Settings size={20} className="text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm">Einstellungen</p>
                    <p className="text-[10px] text-white/40">Organisation verwalten</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
