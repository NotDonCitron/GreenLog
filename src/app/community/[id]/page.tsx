"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/community/follow-button";
import { JoinButton } from "@/components/community/join-button";
import { CommunityFeed } from "@/components/community/feed";
import { InviteAdminModal } from "@/components/community/invite-admin-modal";
import { AdminListModal } from "@/components/community/admin-list-modal";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { useAuth } from "@/components/auth-provider";
import { Leaf, Building2, Users, Sprout, ArrowLeft, Plus, Settings, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { USER_ROLES } from "@/lib/roles";

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
    <span className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, color, onClick }: { icon: LucideIcon; value: number | string; label: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
    >
      <div className={`w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)]/50 flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <p className="font-black text-lg text-[var(--foreground)]">{value}</p>
      <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;
  const { user, memberships, loading: authLoading, setActiveOrganizationId } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats>({ followerCount: 0, strainCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [showAdminList, setShowAdminList] = useState(false);

  const isAdminOrGründer = !!memberships.find(
    (m) => m.organization_id === organizationId && (m.role === USER_ROLES.GRUENDER || m.role === USER_ROLES.ADMIN)
  );

  useEffect(() => {
    // Reset state on organization change to prevent stale data flash
    setOrganization(null);
    setLoading(true);
    setNotFound(false);

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

        const { count: followerCount } = await supabase
          .from("community_followers")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId);

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
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
        <div className="space-y-4 p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    );
  }

  if (notFound || !organization) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
        <header className="px-6 pt-12 pb-4">
          <Link href="/community" className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4 transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm">Zurueck</span>
          </Link>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase font-display text-[var(--foreground)]">
            Community nicht gefunden
          </h1>
        </header>
        <div className="px-6">
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <p className="text-[var(--muted-foreground)]">Diese Community existiert nicht oder wurde entfernt.</p>
          </Card>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 relative z-10">
        <Link href="/community" className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Zurueck</span>
        </Link>
        <div className="flex items-center gap-4">
          {organization.logo_url ? (
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--card)] border border-[var(--border)] flex-shrink-0">
              <img src={organization.logo_url} alt={organization.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/30 flex items-center justify-center flex-shrink-0">
              <Building2 size={24} className="text-[#2FF801]" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
              {organization.name}
            </h1>
            <OrgTypeLabel type={organization.organization_type} />
            <div className="flex gap-2 mt-2">
              <FollowButton organizationId={organizationId} />
              <JoinButton organizationId={organizationId} />
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-6 mt-4 relative z-10">
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-4 rounded-3xl">
          <div className="flex items-center justify-around">
            <StatCard
              icon={Users}
              value={stats.followerCount}
              label="Follower"
              color="text-[#00F5FF]"
            />
            <div className="w-px h-12 bg-[#484849]/50" />
            <StatCard
              icon={Leaf}
              value={stats.strainCount}
              label="Strains"
              color="text-[#2FF801]"
              onClick={() => {
                setActiveOrganizationId(organizationId);
                router.push("/strains?tab=org");
              }}
            />
            <div className="w-px h-12 bg-[#484849]/50" />
            <StatCard
              icon={Sprout}
              value="--"
              label="Grows"
              color="text-[var(--muted-foreground)]"
            />
          </div>
        </Card>
      </div>

      {user && isAdminOrGründer && (
        <div className="px-6 mt-6 relative z-10">
          <div className="grid grid-cols-3 gap-3">
            {/* Strains hinzufügen */}
            <CreateStrainModal
              organizationId={organizationId}
              trigger={
                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#2FF801]/10 border border-[#2FF801]/30 hover:bg-[#2FF801]/20 transition-colors min-h-[100px]">
                  <div className="w-10 h-10 rounded-full bg-[#2FF801]/20 flex items-center justify-center">
                    <Plus size={18} className="text-[#2FF801]" />
                  </div>
                  <span className="text-xs font-bold text-[#2FF801]">Strains</span>
                </button>
              }
              onSuccess={() => setRefreshKey((k) => k + 1)}
            />

            {/* Admin anlegen */}
            <button
              onClick={() => setShowAdminList(true)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#00F5FF]/10 border border-[#00F5FF]/30 hover:bg-[#00F5FF]/20 transition-colors min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#00F5FF]/20 flex items-center justify-center">
                <Users size={18} className="text-[#00F5FF]" />
              </div>
              <span className="text-xs font-bold text-[#00F5FF]">Admin</span>
            </button>

            {/* Einstellungen */}
            <Link
              href="/settings/organization"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-colors min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center">
                <Settings size={18} className="text-[var(--muted-foreground)]" />
              </div>
              <span className="text-xs font-bold text-[var(--muted-foreground)]">Einstellungen</span>
            </Link>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="px-6 mt-8 relative z-10">
        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
          Aktivitaet
        </h2>
        <CommunityFeed organizationId={organizationId} refreshKey={refreshKey} isAdminOrGründer={isAdminOrGründer} orgLogoUrl={organization.logo_url} />
      </div>

      {showAdminList && (
        <AdminListModal
          organizationId={organizationId}
          onClose={() => setShowAdminList(false)}
          onSuccess={() => {
            setShowAdminList(false);
            setRefreshKey((k) => k + 1);
          }}
          onInvite={() => {
            setShowAdminList(false);
            setShowInviteAdmin(true);
          }}
        />
      )}

      {showInviteAdmin && (
        <InviteAdminModal
          organizationId={organizationId}
          onClose={() => setShowInviteAdmin(false)}
          onSuccess={() => {
            setShowInviteAdmin(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      <BottomNav />
    </main>
  );
}
