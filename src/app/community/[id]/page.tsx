"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/community/follow-button";
import { CommunityFeed } from "@/components/community/feed";
import { InviteAdminModal } from "@/components/community/invite-admin-modal";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { StatsBar } from "@/components/social/stats-bar";
import { useAuth } from "@/components/auth-provider";
import { Users, Leaf, Sprout, Loader2, ArrowLeft, Plus, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  organization_type: string;
  license_number: string | null;
  status: string;
  created_at: string;
  logo_url?: string | null;
}

export default function CommunityDetailPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const { user, memberships } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState({ followerCount: 0, strainCount: 0, growCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);

  const isAdminOrGründer = !!memberships.find(
    (m) => m.organization_id === organizationId && (m.role === "gründer" || m.role === "admin")
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, slug, organization_type, license_number, status, created_at, logo_url")
          .eq("id", organizationId)
          .eq("status", "active")
          .single();

        if (orgError || !orgData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setOrganization(orgData);

        const [{ count: followerCount }, { count: strainCount }, { count: growCount }] = await Promise.all([
          supabase.from("community_followers").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
          supabase.from("strains").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
          supabase.from("grows").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
        ]);

        setStats({
          followerCount: followerCount || 0,
          strainCount: strainCount || 0,
          growCount: growCount || 0,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, refreshKey]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center pb-32">
        <Loader2 size={32} className="animate-spin text-[#999]" />
      </main>
    );
  }

  if (notFound || !organization) {
    return (
      <main className="min-h-screen bg-white pb-32">
        <header className="p-6 pb-4">
          <Link href="/community" className="inline-flex items-center gap-2 text-[#999] hover:text-[#1A1A1A] mb-4">
            <ArrowLeft size={16} />
            <span className="text-sm">Zurück</span>
          </Link>
          <h1 className="text-2xl font-black italic uppercase tracking-tight">
            Community nicht gefunden
          </h1>
        </header>
        <div className="px-6">
          <Card className="bg-[#FAFAFA] border-[#E5E5E5] p-8 rounded-2xl text-center">
            <p className="text-[#666]">Diese Community existiert nicht oder wurde entfernt.</p>
          </Card>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-32">
      <header className="p-6 pb-4">
        <Link href="/community" className="inline-flex items-center gap-2 text-[#999] hover:text-[#1A1A1A] mb-4">
          <ArrowLeft size={16} />
          <span className="text-sm">Zurück</span>
        </Link>
      </header>

      {/* Community Header */}
      <div className="px-6">
        {/* Logo and Name */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center flex-shrink-0">
            {organization.logo_url ? (
              <Image
                src={organization.logo_url}
                alt={organization.name}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <Leaf size={32} className="text-[#2FF801]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#1A1A1A] leading-none mb-2">
              {organization.name}
            </h1>
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border border-[#00F5FF] text-[#00F5FF]">
              {organization.organization_type === "club" ? "Club" : "Apotheke"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <StatsBar
          stats={[
            { value: stats.followerCount, label: "Follower" },
            { value: stats.strainCount, label: "Sorten" },
            { value: stats.growCount, label: "Grows" },
          ]}
          highlightIndex={0}
          className="mb-6"
        />

        {/* Follow Button */}
        <div className="mb-6">
          <FollowButton organizationId={organizationId} />
        </div>
      </div>

      {/* Admin Actions */}
      {user && isAdminOrGründer && (
        <div className="px-6 mb-6">
          <div className="flex gap-3">
            <CreateStrainModal
              organizationId={organizationId}
              trigger={
                <button className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#2FF801]/30 transition-colors min-h-[80px]">
                  <div className="w-10 h-10 rounded-full bg-[#2FF801]/10 flex items-center justify-center">
                    <Plus size={18} className="text-[#2FF801]" />
                  </div>
                  <span className="text-xs font-semibold text-[#1A1A1A]">Strain</span>
                </button>
              }
              onSuccess={() => setRefreshKey(k => k + 1)}
            />

            <button
              onClick={() => setShowInviteAdmin(true)}
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#00F5FF]/30 transition-colors min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 flex items-center justify-center">
                <Users size={18} className="text-[#00F5FF]" />
              </div>
              <span className="text-xs font-semibold text-[#1A1A1A]">Admin</span>
            </button>

            <Link
              href="/settings/organization"
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#999]/30 transition-colors min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <Settings size={18} className="text-[#666]" />
              </div>
              <span className="text-xs font-semibold text-[#1A1A1A]">Settings</span>
            </Link>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="px-6">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-4">
          Aktivitäten
        </h2>
        <CommunityFeed
          organizationId={organizationId}
          refreshKey={refreshKey}
          isAdminOrGründer={isAdminOrGründer}
          orgLogoUrl={organization.logo_url}
        />
      </div>

      {showInviteAdmin && (
        <InviteAdminModal
          organizationId={organizationId}
          onClose={() => setShowInviteAdmin(false)}
          onSuccess={() => {
            setShowInviteAdmin(false);
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      <BottomNav />
    </main>
  );
}
