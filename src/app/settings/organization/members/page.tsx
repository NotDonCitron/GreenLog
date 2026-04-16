"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { USER_ROLES } from "@/lib/roles";
import {
  ChevronLeft,
  Loader2,
  Users,
  UserRound,
  Shield,
  Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  role: string;
  membership_status: string;
  joined_at: string | null;
  user: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

function formatJoinDate(dateStr: string | null) {
  if (!dateStr) return "Unbekannt";
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === USER_ROLES.GRUENDER ? "text-[#ffd76a] bg-[#ffd76a]/10 border-[#ffd76a]/20" :
    role === USER_ROLES.ADMIN ? "text-[#ff716c] bg-[#ff716c]/10 border-[#ff716c]/20" :
    role === USER_ROLES.PRAEVENTIONSBEAUFTRAGTER ? "text-[#2FF801] bg-[#2FF801]/10 border-[#2FF801]/20" :
    "text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]/50";
  
  const label = 
    role === USER_ROLES.GRUENDER ? "Gründer" :
    role === USER_ROLES.ADMIN ? "Admin" :
    role === USER_ROLES.PRAEVENTIONSBEAUFTRAGTER ? "Präventionsbeauftragter" :
    role === USER_ROLES.MEMBER ? "Mitglied" : "Viewer";

  return (
    <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

export default function MembersPage() {
  const { user, loading: authLoading, session, activeOrganization, membershipsLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || membershipsLoading) return;

    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (activeOrganization === null) {
      router.push("/profile");
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/organizations/${activeOrganization.organization_id}/members`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error?.message || "Fehler beim Laden der Mitglieder");
        }

        const json = await res.json();
        const memberData = json.data?.members || [];
        
        // Filter out pending members for the general list
        const activeMembers = memberData.filter((m: Member) => m.membership_status === "active");
        
        setMembers(activeMembers);
        setMemberCount(activeMembers.length);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchFollowers();
    }, [authLoading, membershipsLoading, activeOrganization, router]);

    if (authLoading || membershipsLoading || activeOrganization === null) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
      </main>
    );
    }

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
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

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
        >
          <ChevronLeft size={20} className="text-[var(--foreground)]" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
            Mitglieder
          </h1>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-4 relative z-10">
        {/* Member count summary */}
        {!loading && !error && (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-4 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center">
                  <Users size={18} className="text-[#00F5FF]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--foreground)]">{memberCount} Mitglieder</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">aktive Mitgliedschaften</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Lade Mitglieder...</p>
          </div>
        ) : error ? (
          <Card className="bg-[#ff716c]/10 border-[#ff716c]/20 p-6 rounded-3xl">
            <p className="text-[#ff716c] font-bold text-center">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-[var(--muted)] border border-[var(--border)]/50"
            >
              Erneut versuchen
            </Button>
          </Card>
        ) : members.length === 0 ? (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <Users size={32} className="mx-auto text-[#484849] mb-3" />
            <p className="text-[var(--muted-foreground)] font-bold">Keine Mitglieder gefunden</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const isSelf = member.user?.id === user?.id;

              return (
                <Card
                  key={member.id}
                  className={`bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl ${
                    isSelf ? "border-[#00F5FF]/30 bg-[#00F5FF]/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {member.user?.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <UserRound size={18} className="text-[#00F5FF]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm truncate text-[var(--foreground)]">
                            {member.user?.display_name || member.user?.username || "Unbekannt"}
                          </p>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded-full">
                              Du
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RoleBadge role={member.role} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-[9px] text-[#484849] font-mono">
                        <Clock size={10} />
                        seit {formatJoinDate(member.joined_at || member.created_at)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

