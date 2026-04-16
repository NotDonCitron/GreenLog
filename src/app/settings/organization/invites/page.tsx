"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { USER_ROLES } from "@/lib/roles";
import { BottomNav } from "@/components/bottom-nav";
import {
  ChevronLeft,
  Loader2,
  Mail,
  Plus,
  X,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Invite {
  id: string;
  email: string;
  role: "admin" | "staff" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
}

function formatRoleLabel(role: string) {
  switch (role) {
    case USER_ROLES.ADMIN: return "Admin";
    case "staff": return "Staff";
    case USER_ROLES.PRAEVENTIONSBEAUFTRAGTER: return "Präventionsbeauftragter";
    case USER_ROLES.MEMBER: return "Mitglied";
    case USER_ROLES.VIEWER: return "Viewer";
    default: return role;
  }
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === USER_ROLES.ADMIN ? "text-[#ff716c] bg-[#ff716c]/10 border-[#ff716c]/20" :
    role === USER_ROLES.PRAEVENTIONSBEAUFTRAGTER ? "text-[#2FF801] bg-[#2FF801]/10 border-[#2FF801]/20" :
    role === "staff" ? "text-[#00a3ff] bg-[#00a3ff]/10 border-[#00a3ff]/20" :
    "text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]/50";
  return (
    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${color}`}>
      {formatRoleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00a3ff]/10 border border-[#00a3ff]/20 text-[#00a3ff]">
        <Clock size={8} />
        Ausstehend
      </span>
    );
  }
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 text-[#2FF801]">
        <CheckCircle2 size={8} />
        Angenommen
      </span>
    );
  }
  if (status === "revoked") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff716c]/10 border border-[#ff716c]/20 text-[#ff716c]">
        <X size={8} />
        Widerrufen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--muted)] border border-[var(--border)]/50 text-[var(--muted-foreground)]">
      {status}
    </span>
  );
}

export default function InvitesPage() {
  const { user, loading: authLoading, session, activeOrganization, membershipsLoading, isDemoMode } = useAuth();
  const router = useRouter();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [newInvite, setNewInvite] = useState({ 
    email: "", 
    role: USER_ROLES.MEMBER as "admin" | "member" | "präventionsbeauftragter" | "viewer" | "staff"
  });
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null);
  const [createdInviteEmail, setCreatedInviteEmail] = useState<string | null>(null);

  const isOwner = activeOrganization?.role === USER_ROLES.GRUENDER;

  const fetchInvites = useCallback(async () => {
    if (!activeOrganization || !session?.access_token) return;
    if (!isOwner) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization.organization_id}/invites`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Fehler beim Laden");
      }
      const json = await res.json();
      setInvites(json.data?.invites || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [activeOrganization, session?.access_token, isOwner]);

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
    if (activeOrganization.role !== USER_ROLES.GRUENDER) {
      router.push("/settings/organization/members");
      return;
    }
    void fetchInvites();
  }, [authLoading, membershipsLoading, activeOrganization, fetchInvites, router]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvite.email || !newInvite.role || !session?.access_token || isDemoMode) return;

    setCreating(true);
    setStatusMessage(null);
    setCreatedInviteToken(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}/invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: newInvite.email, role: newInvite.role }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Fehler beim Erstellen");

      setCreatedInviteToken(json.data?.token);
      setCreatedInviteEmail(json.data?.invite?.email);
      setStatusMessage({ type: "success", msg: "Einladung erstellt! Bitte Link teilen." });
      setNewInvite({ email: "", role: USER_ROLES.ADMIN });
      setShowCreateForm(false);
      await fetchInvites();
    } catch (err: unknown) {
      setStatusMessage({ type: "error", msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(token);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!session?.access_token || isDemoMode) return;
    setActionLoading(inviteId);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}/invites?id=${inviteId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Fehler beim Widerrufen");
      }
      await fetchInvites();
    } catch (err: unknown) {
      setStatusMessage({ type: "error", msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setActionLoading(null);
    }
  };

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

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = createdInviteToken ? `${baseUrl}/invite/${createdInviteToken}` : null;

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
            Mitglieder einladen
          </h1>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-4 relative z-10">
        {statusMessage && (
          <div className={`p-3 rounded-2xl flex items-start gap-2 text-sm font-bold border ${
            statusMessage.type === "success"
              ? "bg-[#2FF801]/10 border-[#2FF801]/30 text-[#2FF801]"
              : "bg-[#ff716c]/10 border-[#ff716c]/30 text-[#ff716c]"
          }`}>
            {statusMessage.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span>{statusMessage.msg}</span>
          </div>
        )}

        {createdInviteToken && inviteLink && (
          <Card className="bg-[var(--card)] border border-[#2FF801]/30 p-5 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#2FF801]" />
              <p className="text-sm font-black text-[#2FF801]">Einladung erstellt für {createdInviteEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--muted-foreground)] text-xs font-mono h-10 flex-1"
              />
              <Button
                size="sm"
                onClick={() => void handleCopyLink(createdInviteToken)}
                className="h-10 bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black font-black"
              >
                {copied === createdInviteToken ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <p className="text-[10px] text-[#484849] font-bold">
              Dieser Link ist 7 Tage gültig. Bitte teile ihn sicher mit der einzuladenden Person.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreatedInviteToken(null)}
              className="w-full text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Schließen
            </Button>
          </Card>
        )}

        {isOwner && (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
            {!showCreateForm ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full h-12 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs"
              >
                <Plus size={14} className="mr-2" />
                Neue Einladung
              </Button>
            ) : (
              <form onSubmit={(e) => void handleCreateInvite(e)} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)]">Neue Einladung</p>
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setNewInvite({ email: "", role: USER_ROLES.MEMBER }); }}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  <Input
                    type="email"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@beispiel.de"
                    required
                    disabled={isDemoMode}
                    className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] h-12 rounded-xl focus:border-[#00F5FF]"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)] mb-1 px-1">Rolle wählen</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: USER_ROLES.MEMBER, label: "Mitglied" },
                      { id: USER_ROLES.ADMIN, label: "Admin" },
                      { id: USER_ROLES.PRAEVENTIONSBEAUFTRAGTER, label: "Prävent." }
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setNewInvite(prev => ({ ...prev, role: r.id as any }))}
                        className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          newInvite.role === r.id 
                            ? "bg-[#00F5FF]/20 border-[#00F5FF] text-[#00F5FF]" 
                            : "bg-[var(--muted)] border-[var(--border)]/50 text-[var(--muted-foreground)] hover:border-[var(--border)]"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]/50">
                  <Shield size={14} className="text-[var(--muted-foreground)]" />
                  <span className="text-[10px] text-[var(--muted-foreground)] italic">
                    {newInvite.role === USER_ROLES.ADMIN ? "Voller Zugriff auf Einstellungen" : 
                     newInvite.role === USER_ROLES.PRAEVENTIONSBEAUFTRAGTER ? "Compliance & Prävention (KCanG § 23)" : 
                     "Standard-Mitglied der Organisation"}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={creating || !newInvite.email || isDemoMode}
                  className="w-full h-12 bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                  Einladung senden
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowCreateForm(false); setNewInvite({ email: "", role: USER_ROLES.ADMIN }); }}
                  className="w-full h-10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--muted)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 font-black uppercase tracking-widest text-xs"
                >
                  Abbrechen
                </Button>
                {isDemoMode && <p className="text-[10px] text-center text-[#484849] italic">Im Demo-Modus deaktiviert</p>}
              </form>
            )}
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
          </div>
        ) : error ? (
          <Card className="bg-[#ff716c]/10 border-[#ff716c]/20 p-6 rounded-3xl">
            <p className="text-[#ff716c] font-bold text-center">{error}</p>
            <Button onClick={() => void fetchInvites()} className="mt-4 w-full bg-[var(--muted)] border border-[var(--border)]/50">
              Erneut versuchen
            </Button>
          </Card>
        ) : invites.length === 0 ? (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <Mail size={32} className="mx-auto text-[#484849] mb-3" />
            <p className="text-[var(--muted-foreground)] font-bold">Keine ausstehenden Einladungen</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <Card key={invite.id} className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
                      <Mail size={16} className="text-[#00F5FF]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate text-[var(--foreground)]">{invite.email}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] font-mono truncate">
                        Läuft ab: {new Date(invite.expires_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <RoleBadge role={invite.role} />
                    <StatusBadge status={invite.status} />
                    {invite.status === "pending" && isOwner && (
                      <button
                        onClick={() => void handleRevokeInvite(invite.id)}
                        disabled={actionLoading === invite.id || isDemoMode}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all mt-1 ${
                          actionLoading === invite.id || isDemoMode
                            ? "bg-[#ff716c]/5 border-[#ff716c]/10 text-[#ff716c]/30"
                            : "bg-[#ff716c]/10 border-[#ff716c]/20 text-[#ff716c] hover:bg-[#ff716c]/20 hover:border-[#ff716c]/30"
                        }`}
                      >
                        <X size={8} />
                        {actionLoading === invite.id ? "..." : "Widerrufen"}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isOwner && !loading && (
          <div className="text-center py-6">
            <p className="text-xs text-[#484849] font-bold uppercase tracking-wider">
              Nur Owner können Einladungen verwalten
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
