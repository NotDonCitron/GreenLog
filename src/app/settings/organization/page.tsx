"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import {
  ChevronLeft,
  Loader2,
  Type,
  Shield,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrgLogoUpload } from "@/components/community/org-logo-upload";
import { Image } from "lucide-react";

export default function SettingsOrganizationPage() {
  const { activeOrganization, session, isDemoMode } = useAuth();
  const router = useRouter();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showNameForm, setShowNameForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const isOwner = activeOrganization?.role === "gründer";
  const orgName = activeOrganization?.organizations?.name || "Organisation";

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !session?.access_token || isDemoMode) return;

    setSavingName(true);
    setNameMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ name: newName.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
      setNameMessage({ type: "success", msg: "Name erfolgreich geändert" });
      setShowNameForm(false);
      setNewName("");
      // Refresh auth context would be ideal here — for now the user can navigate back
    } catch (err: any) {
      setNameMessage({ type: "error", msg: err.message });
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (deleteConfirmText !== orgName || !session?.access_token || isDemoMode) return;

    setDeleting(true);
    setDeleteMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Löschen");
      setDeleteMessage({ type: "success", msg: "Community gelöscht. Du wirst zurückgeleitet..." });
      setTimeout(() => router.push("/community"), 1500);
    } catch (err: any) {
      setDeleteMessage({ type: "error", msg: err.message });
    } finally {
      setDeleting(false);
    }
  };

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[#355E3B] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </main>
    );
  }

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
            {orgName}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            Einstellungen
          </h1>
        </div>
      </header>

      <div className="px-8 space-y-6 mt-4">
        {/* Logo ändern */}
        <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl">
          <div className="flex items-center gap-4">
            <OrgLogoUpload
              currentLogoUrl={logoUrl || activeOrganization.organizations?.logo_url}
              organizationId={activeOrganization.organization_id}
              size={80}
              onSuccess={(url) => {
                setLogoUrl(url);
                router.refresh();
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-black text-sm">Logo ändern</p>
              <p className="text-[10px] text-white/40">Bild für deine Community</p>
            </div>
          </div>
        </Card>

        {nameMessage && (
          <div className={`p-3 rounded-2xl flex items-start gap-2 text-sm font-bold border ${
            nameMessage.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {nameMessage.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span>{nameMessage.msg}</span>
          </div>
        )}

        {/* Name ändern */}
        <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl">
          {!showNameForm ? (
            <button
              onClick={() => { setShowNameForm(true); setNewName(orgName); }}
              className="w-full flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
                <Type size={20} className="text-[#00F5FF]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm">Name ändern</p>
                <p className="text-[10px] text-white/40">Community-Namen anpassen</p>
              </div>
            </button>
          ) : (
            <form onSubmit={(e) => void handleSaveName(e)} className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-white/60">Name ändern</p>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Neuer Name"
                required
                disabled={isDemoMode}
                className="bg-black/20 border-white/10 text-white h-12 rounded-xl focus:border-[#00F5FF]"
              />
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={savingName || !newName.trim() || isDemoMode}
                  className="flex-1 h-12 bg-[#2FF801] hover:bg-[#2FF801]/80 text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {savingName ? <Loader2 size={14} className="animate-spin" /> : null}
                  Speichern
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowNameForm(false); setNameMessage(null); }}
                  className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-widest text-xs"
                >
                  Abbrechen
                </Button>
              </div>
              {isDemoMode && <p className="text-[10px] text-center text-white/20 italic">Im Demo-Modus deaktiviert</p>}
            </form>
          )}
        </Card>

        {/* Admins verwalten — Owner only */}
        {isOwner && (
          <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl">
            <button
              onClick={() => router.push("/settings/organization/invites")}
              className="w-full flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                <Shield size={20} className="text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm">Admins verwalten</p>
                <p className="text-[10px] text-white/40">Admin einladen oder widerrufen</p>
              </div>
            </button>
          </Card>
        )}

        {/* Community löschen — Owner only */}
        {isOwner && (
          <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm text-red-400">Community löschen</p>
                  <p className="text-[10px] text-white/40">Organisation dauerhaft entfernen</p>
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 font-bold">Warnung: Diese Aktion kann nicht rückgängig gemacht werden!</p>
                  <p className="text-[10px] text-red-400/60 mt-1">
                    Gib <span className="font-mono font-black">{orgName}</span> ein, um zu bestätigen.
                  </p>
                </div>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={orgName}
                  disabled={isDemoMode}
                  className="bg-black/20 border-white/10 text-white h-12 rounded-xl focus:border-red-500"
                />
                {deleteMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold border ${
                    deleteMessage.type === "success"
                      ? "bg-green-500/10 border-green-500/20 text-green-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    {deleteMessage.msg}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => void handleDeleteOrg()}
                    disabled={deleteConfirmText !== orgName || deleting || isDemoMode}
                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                    Löschen
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteMessage(null); }}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-widest text-xs"
                  >
                    Abbrechen
                  </Button>
                </div>
                {isDemoMode && <p className="text-[10px] text-center text-white/20 italic">Im Demo-Modus deaktiviert</p>}
              </div>
            )}
          </Card>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
