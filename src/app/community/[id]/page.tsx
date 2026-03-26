"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/community/follow-button";
import { CommunityFeed } from "@/components/community/feed";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { useAuth } from "@/components/auth-provider";
import { Leaf, Building2, Users, Sprout, Loader2, ArrowLeft, Plus, Settings } from "lucide-react";
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

interface OrganizationStats {
  followerCount: number;
  strainCount: number;
}

function OrgTypeLabel({ type }: { type: string }) {
  const label = type === "club" ? "Club" : type === "pharmacy" ? "Apotheke" : type;
  return (
    <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, color }: { icon: typeof Leaf; value: number | string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3">
      <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <p className="font-black text-lg">{value}</p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default function CommunityDetailPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const { user, memberships, loading: authLoading } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats>({ followerCount: 0, strainCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdminOrGründer = !!memberships.find(
    (m) => m.organization_id === organizationId && (m.role === "gründer" || m.role === "admin")
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch organization
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

        // Fetch follower count
        const { count: followerCount } = await supabase
          .from("community_followers")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId);

        // Fetch strain count
        const { count: strainCount } = await supabase
          .from("strains")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId);

        setStats({
          followerCount: followerCount || 0,
          strainCount: strainCount || 0,
        });
      } catch (err) {
        console.error("Error fetching community data:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, refreshKey]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#355E3B] text-white pb-32 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white/40" />
      </main>
    );
  }

  if (notFound || !organization) {
    return (
      <main className="min-h-screen bg-[#355E3B] text-white pb-32">
        <header className="p-8 pb-4">
          <Link href="/community" className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-4">
            <ArrowLeft size={16} />
            <span className="text-sm">Zurueck</span>
          </Link>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">
            Community nicht gefunden
          </h1>
        </header>
        <div className="px-8">
          <Card className="bg-[#1e3a24] border-white/10 p-8 rounded-3xl text-center">
            <p className="text-white/60">Diese Community existiert nicht oder wurde entfernt.</p>
          </Card>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4">
        <Link href="/community" className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-4">
          <ArrowLeft size={16} />
          <span className="text-sm">Zurueck</span>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
              Deine Community
            </p>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none mt-1">
              {organization.name}
            </h1>
            <OrgTypeLabel type={organization.organization_type} />
          </div>
          <div className="flex items-center gap-2">
            {user && isAdminOrGründer && (
              <CreateStrainModal
                organizationId={organizationId}
                trigger={
                  <button className="w-10 h-10 rounded-full bg-[#2FF801]/20 border border-[#2FF801]/40 flex items-center justify-center text-[#2FF801] hover:bg-[#2FF801]/30 transition-colors">
                    <Plus size={18} />
                  </button>
                }
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            )}
            {user && isAdminOrGründer && (
              <Link
                href="/settings/organization"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
              >
                <Settings size={16} />
              </Link>
            )}
            <FollowButton organizationId={organizationId} />
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-8 mt-4">
        <Card className="bg-[#1e3a24] border-white/10 p-4 rounded-3xl">
          <div className="flex items-center justify-around">
            <StatCard
              icon={Users}
              value={stats.followerCount}
              label="Follower"
              color="text-[#00F5FF]"
            />
            <div className="w-px h-12 bg-white/10" />
            <StatCard
              icon={Leaf}
              value={stats.strainCount}
              label="Sorten"
              color="text-[#2FF801]"
            />
            <div className="w-px h-12 bg-white/10" />
            <StatCard
              icon={Sprout}
              value="--"
              label="Grows"
              color="text-white/40"
            />
          </div>
        </Card>
      </div>

      {/* Feed */}
      <div className="px-8 mt-8">
        <h2 className="text-sm font-black uppercase tracking-wider text-white/60 mb-4">
          Aktivitaet
        </h2>
        <CommunityFeed organizationId={organizationId} refreshKey={refreshKey} isAdminOrGründer={isAdminOrGründer} orgLogoUrl={organization.logo_url} />
      </div>

      <BottomNav />
    </main>
  );
}
