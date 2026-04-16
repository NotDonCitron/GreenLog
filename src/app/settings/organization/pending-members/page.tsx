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
  Check,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";

interface PendingMemberUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface PendingMember {
  id: string;
  user_id: string;
  joined_at: string | null;
  user: PendingMemberUser | null;
}

function formatRequestDate(dateStr: string | null) {
  if (!dateStr) return "Unbekannt";
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PendingMembersPage() {
  const { user, session, activeOrganization, isDemoMode } = useAuth();
  const router = useRouter();

  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingMember, setRejectingMember] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const isAdmin =
    activeOrganization?.role === USER_ROLES.GRUENDER ||
    activeOrganization?.role === USER_ROLES.ADMIN;

  useEffect(() => {
    // Wait for activeOrganization to load before redirecting
    if (activeOrganization === undefined) return;

    if (!activeOrganization) {
      router.push("/profile");
      return;
    }

    if (!isAdmin) {
      router.push("/settings/organization");
      return;
    }

    void fetchPendingMembers();
  }, [activeOrganization, isAdmin, router]);

  const fetchPendingMembers = async () => {
    if (!activeOrganization || !session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization.organization_id}/pending-members`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Fehler beim Laden");
      setPendingMembers(json.data.pendingMembers || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (memberId: string) => {
    if (!activeOrganization || !session?.access_token || isDemoMode) return;

    setProcessing(memberId);
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization.organization_id}/members/${memberId}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Fehler bei der Genehmigung");

      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
      setActionMessage({ type: "success", msg: "Mitglied erfolgreich genehmigt" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fehler bei der Genehmigung";
      setActionMessage({ type: "error", msg: message });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!activeOrganization || !session?.access_token || !rejectingMember || isDemoMode)
      return;

    setProcessing(rejectingMember);
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization.organization_id}/members/${rejectingMember}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reason: rejectReason || null }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Fehler beim Ablehnen");

      setPendingMembers((prev) => prev.filter((m) => m.id !== rejectingMember));
      setActionMessage({ type: "success", msg: "Mitglied abgelehnt" });
      setRejectDialogOpen(false);
      setRejectReason("");
      setRejectingMember(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fehler beim Ablehnen";
      setActionMessage({ type: "error", msg: message });
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (memberId: string) => {
    setRejectingMember(memberId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  // Show loader while checking auth (prevents flash of wrong redirect)
  if (activeOrganization === undefined) {
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
          onClick={() => router.push("/settings/organization")}
          className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
        >
          <ChevronLeft size={20} className="text-[var(--foreground)]" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
            Ausstehende Anfragen
          </h1>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-4 relative z-10">
        {actionMessage && (
          <div
            className={`p-3 rounded-2xl flex items-start gap-2 text-sm font-bold border ${
              actionMessage.type === "success"
                ? "bg-[#2FF801]/10 border-[#2FF801]/30 text-[#2FF801]"
                : "bg-[#ff716c]/10 border-[#ff716c]/30 text-[#ff716c]"
            }`}
          >
            {actionMessage.type === "success" ? (
              <Check size={16} className="shrink-0" />
            ) : (
              <X size={16} className="shrink-0" />
            )}
            <span>{actionMessage.msg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
          </div>
        ) : error ? (
          <Card className="bg-[#ff716c]/10 border-[#ff716c]/20 p-6 rounded-3xl">
            <p className="text-[#ff716c] font-bold text-center">{error}</p>
            <Button
              onClick={() => void fetchPendingMembers()}
              className="mt-4 w-full bg-[var(--muted)] border border-[var(--border)]/50"
            >
              Erneut versuchen
            </Button>
          </Card>
        ) : pendingMembers.length === 0 ? (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <Users size={32} className="mx-auto text-[#484849] mb-3" />
            <p className="text-[var(--muted-foreground)] font-bold">
              Keine ausstehenden Anfragen
            </p>
            <p className="text-[10px] text-[#484849] mt-1">
              Alle Mitgliedschaften wurden überprüft.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingMembers.map((member) => (
              <Card
                key={member.id}
                className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl"
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
                          {member.user?.display_name ||
                            member.user?.username ||
                            "Unbekannt"}
                        </p>
                      </div>
                      {member.user?.username && (
                        <p className="text-[10px] text-[var(--muted-foreground)] font-mono truncate">
                          @{member.user.username}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-[10px] text-[#484849] font-mono">
                      angefordert am{" "}
                      {formatRequestDate(member.joined_at)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleApprove(member.id)}
                        disabled={processing !== null || isDemoMode}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Genehmigen"
                      >
                        {processing === member.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Check size={10} />
                        )}
                        Genehmigen
                      </button>
                      <button
                        onClick={() => openRejectDialog(member.id)}
                        disabled={processing !== null || isDemoMode}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#ff716c]/30 hover:border-[#ff716c]/60 hover:bg-[#ff716c]/10 text-[#ff716c] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Ablehnen"
                      >
                        <X size={10} />
                        Ablehnen
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)]/50 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">
              Mitgliedschaft ablehnen
            </DialogTitle>
            <DialogDescription className="text-[var(--muted-foreground)]">
              Möchtest du einen Grund für die Ablehnung angeben? Dies wird dem
              Nutzer nicht mitgeteilt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Optional: Grund für die Ablehnung..."
              className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] rounded-xl resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingMember(null);
                setRejectReason("");
              }}
              className="flex-1 h-12 bg-[var(--muted)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 text-[var(--muted-foreground)] font-black uppercase tracking-widest text-xs"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => void handleReject()}
              disabled={processing !== null}
              className="flex-1 h-12 bg-[#ff716c] hover:bg-[#ff716c]/80 text-[var(--foreground)] font-black uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {processing !== null ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Ablehnen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </main>
  );
}
