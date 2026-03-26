"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
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
  UserRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    case "admin": return "Admin";
    case "staff": return "Staff";
    case "member": return "Mitglied";
    default: return role;
  }
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "admin" ? "text-red-400 bg-red-400/10 border-red-400/20" :
    role === "staff" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
    "text-white/40 bg-white/5 border-white/10";
  return (
    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${color}`}>
      {formatRoleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
        <Clock size={8} />
        Ausstehend
      </span>
    );
  }
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
        <CheckCircle2 size={8} />
        Angenommen
      </span>
    );
  }
  if (status === "revoked") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
        <X size={8} />
        Widerrufen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
      {status}
    </span>
  );
}

export default function InvitesPage() {
  const { session, activeOrganization, isDemoMode } = useAuth();
  const router = useRouter();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [newInvite, setNewInvite] = useState({ email: "", role: "admin" as "admin" });
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null);
  const [createdInviteEmail, setCreatedInviteEmail] = useState<string | null>(null);

  // Only Gründer (owner) can manage invites
  const isOwner = activeOrganization?.role === "gründer";

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
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Laden");
      }
      const data = await res.json();
      setInvites(data.invites || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeOrganization, session?.access_token, isOwner]);

  useEffect(() => {
    if (!activeOrganization) {
      router.push("/profile");
      return;
    }
    if (activeOrganization.role !== "gründer") {
      router.push("/settings/organization/members");
      return;
    }
    void fetchInvites();
  }, [activeOrganization, fetchInvites, router]);

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Erstellen");

      setCreatedInviteToken(data.token);
      setCreatedInviteEmail(data.invite.email);
      setStatusMessage({ type: "success", msg: "Einladung erstellt! Bitte Link teilen." });
      setNewInvite({ email: "", role: "admin" });
      setShowCreateForm(false);
      await fetchInvites();
    } catch (err: any) {
      setStatusMessage({ type: "error", msg: err.message });
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
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Widerrufen");
      }
      await fetchInvites();
    } catch (err: any) {
      setStatusMessage({ type: "error", msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[#355E3B] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </main>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = createdInviteToken ? `${baseUrl}/invite/${createdInviteToken}` : null;

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            Admin anlegen
          </h1>
        </div>
      </header>

      <div className="px-8 space-y-6 mt-4">
        {statusMessage && (
          <div className={`p-3 rounded-2xl flex items-start gap-2 text-sm font-bold border ${
            statusMessage.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {statusMessage.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span>{statusMessage.msg}</span>
          </div>
        )}

        {createdInviteToken && inviteLink && (
          <Card className="bg-[#1e3a24] border-[#2FF801]/20 p-5 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#2FF801]" />
              <p className="text-sm font-black text-[#2FF801]">Einladung erstellt für {createdInviteEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="bg-black/20 border-white/10 text-white/70 text-xs font-mono h-10 flex-1"
              />
              <Button
                size="sm"
                onClick={() => void handleCopyLink(createdInviteToken)}
                className="h-10 bg-[#2FF801] hover:bg-[#2FF801]/80 text-black font-black"
              >
                {copied === createdInviteToken ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <p className="text-[10px] text-white/30 font-bold">
              Dieser Link ist 7 Tage gültig. Bitte teile ihn sicher mit der einzuladenden Person.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreatedInviteToken(null)}
              className="w-full text-white/40 hover:text-white"
            >
              Schließen
            </Button>
          </Card>
        )}

        {isOwner && (
          <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl">
            {!showCreateForm ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full h-12 bg-[#00F5FF] hover:bg-[#00F5FF]/80 text-black font-black uppercase tracking-widest text-xs"
              >
                <Plus size={14} className="mr-2" />
                Neue Einladung
              </Button>
            ) : (
              <form onSubmit={(e) => void handleCreateInvite(e)} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60">Neue Einladung</p>
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setNewInvite({ email: "", role: "admin" }); }}
                    className="text-white/40 hover:text-white"
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
                    className="bg-black/20 border-white/10 text-white h-12 rounded-xl focus:border-[#00F5FF]"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Admin</span>
                  <span className="text-[10px] text-white/40">Nur Admins können eingeladen werden</span>
                </div>

                <Button
                  type="submit"
                  disabled={creating || !newInvite.email || isDemoMode}
                  className="w-full h-12 bg-[#2FF801] hover:bg-[#2FF801]/80 text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                  Einladung senden
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowCreateForm(false); setNewInvite({ email: "", role: "admin" }); }}
                  className="w-full h-10 text-white/40 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-xs"
                >
                  Abbrechen
                </Button>
                {isDemoMode && <p className="text-[10px] text-center text-white/20 italic">Im Demo-Modus deaktiviert</p>}
              </form>
            )}
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-white/40" size={32} />
          </div>
        ) : error ? (
          <Card className="bg-red-500/10 border-red-500/20 p-6 rounded-3xl">
            <p className="text-red-400 font-bold text-center">{error}</p>
            <Button onClick={() => void fetchInvites()} className="mt-4 w-full bg-white/10">
              Erneut versuchen
            </Button>
          </Card>
        ) : invites.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-8 rounded-3xl text-center">
            <Mail size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40 font-bold">Keine ausstehenden Einladungen</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <Card key={invite.id} className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
                      <Mail size={16} className="text-[#00F5FF]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{invite.email}</p>
                      <p className="text-[10px] text-white/40 font-mono truncate">
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
                            ? "bg-red-500/5 border-red-500/10 text-red-400/30"
                            : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30"
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
            <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
              Nur Owner können Einladungen verwalten
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
