"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import {
  ChevronLeft,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
  UserRound,
  Download,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user, signOut, isDemoMode } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || "");
        setUsername(data.username || "");
      }
    }
    async function getConsents() {
      if (!user) return;
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch('/api/gdpr/consent', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.data) {
          const map: Record<string, { granted: boolean | null }> = {};
          json.data.forEach((c: { consent_type: string; granted: boolean | null }) => {
            map[c.consent_type] = { granted: c.granted };
          });
          setConsents(map);
        }
      } catch {}
    }
    getProfile();
    getConsents();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isDemoMode) return;

    setIsUpdatingProfile(true);
    setProfileStatus(null);

    try {
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_");

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: cleanUsername
        })
        .eq('id', user.id);

      if (error) {
        if (error.message.includes("unique")) throw new Error("Dieser Benutzername ist bereits vergeben.");
        throw error;
      }

      setProfileStatus({ type: 'success', msg: "Profil erfolgreich aktualisiert." });
    } catch (err: unknown) {
      setProfileStatus({ type: 'error', msg: err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err) });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState("");
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Data Export
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Consent state
  const [consents, setConsents] = useState<Record<string, { granted: boolean | null }>>({});
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToSubmit = newEmail.trim().toLowerCase();

    if (!emailToSubmit || isDemoMode) return;

    if (emailToSubmit === user?.email?.toLowerCase()) {
      setEmailStatus({ type: 'error', msg: "Die neue E-Mail ist identisch mit der aktuellen." });
      return;
    }

    setIsUpdatingEmail(true);
    setEmailStatus(null);

    try {
      // Session kurz auffrischen
      await supabase.auth.refreshSession();

      // Dynamische Redirect URL (Vercel oder Localhost)
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined;

      const { error } = await supabase.auth.updateUser(
        { email: emailToSubmit },
        { emailRedirectTo: redirectUrl }
      );

      if (error) {
        if (error.message.includes("invalid") && user?.email?.includes("test.com")) {
           throw new Error("Fehler beim Versand an die ALTE E-Mail (test.com). Klicke trotzdem auf den Link in deiner NEUEN E-Mail!");
        }
        throw error;
      }

      setEmailStatus({
        type: 'success',
        msg: `Anfrage für ${emailToSubmit} gesendet! Checke dein Gmail-Postfach.`
      });
      setNewEmail("");
    } catch (err: unknown) {
      setEmailStatus({ type: 'error', msg: `${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleResetAccount = async () => {
    if (confirmReset !== "LÖSCHEN" || isDemoMode) return;

    setIsResetting(true);
    setResetStatus(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Nicht eingeloggt");

      // Use GDPR deletion API (handles club memberships correctly)
      const res = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Löschung fehlgeschlagen");
      }

      setResetStatus({
        type: 'success',
        msg: json.data.has_active_memberships
          ? "Account wurde anonymisiert. Club-Daten bleiben aus rechtlichen Gründen erhalten."
          : "Account und alle Daten wurden vollständig gelöscht.",
      });

      // Nach kurzem Delay ausloggen
      setTimeout(async () => {
        await signOut();
        router.push("/login");
      }, 3000);

    } catch (err: unknown) {
      setResetStatus({ type: 'error', msg: err instanceof Error ? err.message : String(err) });
      setIsResetting(false);
    }
  };

  const handleExportData = async () => {
    if (isDemoMode) return;

    setIsExporting(true);
    setExportStatus(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Nicht eingeloggt");

      const res = await fetch('/api/gdpr/export', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Export fehlgeschlagen");
      }

      const json = await res.json();

      // Download as JSON file
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `greenlog-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus({ type: 'success', msg: "Daten wurden heruntergeladen." });
    } catch (err: unknown) {
      setExportStatus({ type: 'error', msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateConsent = async (consentType: string, granted: boolean) => {
    if (isDemoMode) return;
    setIsUpdatingConsent(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      await fetch('/api/gdpr/consent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consent_type: consentType, granted }),
      });
      setConsents(prev => ({ ...prev, [consentType]: { granted } }));
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  if (!user && !isDemoMode) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">Du musst eingeloggt sein.</p>
          <Button onClick={() => router.push("/login")} className="bg-[#2FF801] text-black font-black">
            Zum Login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <header className="px-6 pt-12 pb-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">Account</p>
          <h1 className="text-2xl font-black italic uppercase font-display">Einstellungen</h1>
        </div>
      </header>

      <div className="px-6 space-y-8 mt-6">
        {/* Profil bearbeiten */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <UserRound size={16} className="text-[#2FF801]" />
            <h2 className="text-xs font-black uppercase tracking-widest">Profil-Informationen</h2>
          </div>

          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6 rounded-[2rem] space-y-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest ml-1">Anzeigename</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="z.B. Pascal"
                  className="bg-[var(--background)] border-[var(--border)]/50 rounded-xl h-12 focus:border-[#2FF801]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest ml-1">Benutzername (@)</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="benutzername"
                  className="bg-[var(--background)] border-[var(--border)]/50 rounded-xl h-12 focus:border-[#2FF801] font-mono text-sm"
                />
              </div>

              {profileStatus && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold border ${
                  profileStatus.type === 'success' ? 'bg-[#2FF801]/10 border-[#2FF801]/20 text-[#2FF801]' : 'bg-[#ff716c]/10 border-[#ff716c]/20 text-[#ff716c]'
                }`}>
                  {profileStatus.type === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
                  <span>{profileStatus.msg}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isUpdatingProfile || isDemoMode}
                className="w-full h-12 bg-[#2FF801] text-black font-black uppercase tracking-widest rounded-xl"
              >
                {isUpdatingProfile ? <Loader2 className="animate-spin" size={18} /> : "Profil speichern"}
              </Button>
            </form>
          </Card>
        </section>

        {/* Email ändern */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Mail size={16} className="text-[#00F5FF]" />
            <h2 className="text-xs font-black uppercase tracking-widest">E-Mail Adresse ändern</h2>
          </div>

          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6 rounded-[2rem] space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest">Aktuelle E-Mail</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{user?.email || "Demo Modus"}</p>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest ml-1">Neue E-Mail</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@neu.de"
                  disabled={isDemoMode}
                  className="bg-[var(--background)] border-[var(--border)]/50 rounded-xl h-12 focus:border-[#00F5FF]"
                />
              </div>

              {emailStatus && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold uppercase tracking-tight border ${
                  emailStatus.type === 'success' ? 'bg-[#2FF801]/10 border-[#2FF801]/20 text-[#2FF801]' : 'bg-[#ff716c]/10 border-[#ff716c]/20 text-[#ff716c]'
                }`}>
                  {emailStatus.type === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
                  <span>{emailStatus.msg}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isUpdatingEmail || !newEmail || isDemoMode}
                className="w-full h-12 bg-[#00F5FF] text-black font-black uppercase tracking-widest rounded-xl"
              >
                {isUpdatingEmail ? <Loader2 className="animate-spin" size={18} /> : "Update E-Mail"}
              </Button>
              {isDemoMode && <p className="text-[8px] text-center text-[var(--muted-foreground)] italic">Im Demo-Modus deaktiviert</p>}
            </form>
          </Card>
        </section>

        {/* Passwort ändern */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Lock size={16} className="text-[#ffd76a]" />
            <h2 className="text-xs font-black uppercase tracking-widest">Passwort</h2>
          </div>
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6 rounded-[2rem]">
             <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
               Um dein Passwort zu ändern, logge dich aus und nutze die "Passwort vergessen" Funktion im Login-Terminal.
             </p>
          </Card>
        </section>

        {/* Datenschutz & Consent */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Shield size={16} className="text-[#2FF801]" />
            <h2 className="text-xs font-black uppercase tracking-widest">Datenschutz</h2>
          </div>

          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6 rounded-[2rem] space-y-4">
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Verwalte hier deine Einwilligungen gemäß DSGVO.
            </p>

            {[
              { key: 'privacy_policy', label: 'Datenschutzerklärung', required: true },
              { key: 'terms_of_service', label: 'Nutzungsbedingungen', required: true },
              { key: 'health_data_processing', label: 'Verarbeitung von Gesundheitsdaten', required: false },
              { key: 'marketing_emails', label: 'Marketing-E-Mails', required: false },
              { key: 'analytics', label: 'Analyse-Cookies', required: false },
            ].map(({ key, label, required }) => {
              const isGranted = required ? (consents[key]?.granted ?? true) : consents[key]?.granted ?? false;
              return (
              <div key={key} className="flex items-center justify-between py-2 border-b border-[var(--border)]/30 last:border-0">
                <div>
                  <p className="text-xs font-bold text-[var(--foreground)]">{label}</p>
                  {required && <p className="text-[10px] text-[var(--muted-foreground)]">Erforderlich</p>}
                </div>
                <button
                  onClick={() => handleUpdateConsent(key, !isGranted)}
                  disabled={isDemoMode || required || isUpdatingConsent}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isGranted ? 'bg-[#2FF801]' : 'bg-[var(--muted)]'
                  } ${(required || isUpdatingConsent) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      isGranted ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              );
            })}
          </Card>
        </section>

        {/* Datenexport */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Download size={16} className="text-[#00F5FF]" />
            <h2 className="text-xs font-black uppercase tracking-widest">Meine Daten</h2>
          </div>

          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6 rounded-[2rem] space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Du kannst alle deine Daten als JSON-Datei exportieren (Art. 20 DSGVO).
              </p>
            </div>

            {exportStatus && (
              <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold border ${
                exportStatus.type === 'success' ? 'bg-[#2FF801]/10 border-[#2FF801]/20 text-[#2FF801]' : 'bg-[#ff716c]/10 border-[#ff716c]/20 text-[#ff716c]'
              }`}>
                <span>{exportStatus.msg}</span>
              </div>
            )}

            <Button
              onClick={handleExportData}
              disabled={isExporting || isDemoMode}
              className="w-full h-12 bg-[#00F5FF] text-black font-black uppercase tracking-widest rounded-xl"
            >
              {isExporting ? <Loader2 className="animate-spin" size={18} /> : "Daten herunterladen"}
            </Button>
            {isDemoMode && <p className="text-[8px] text-center text-[var(--muted-foreground)] italic">Im Demo-Modus deaktiviert</p>}
          </Card>
        </section>

        {/* Account löschen */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Trash2 size={16} className="text-[#ff716c]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-[#ff716c]">Account löschen</h2>
          </div>

          <Card className="bg-[var(--card)] border border-[#ff716c]/20 p-6 rounded-[2rem] space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-[#ff716c]">Daten löschen</h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Dies löscht unwiderruflich alle deine Daten gemäß Art. 17 DSGVO. Bei aktiver Club-Mitgliedschaft werden Daten aus rechtlichen Gründen anonymisiert statt gelöscht.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-[#ff716c]/60 uppercase tracking-widest ml-1">Tippe LÖSCHEN zur Bestätigung</Label>
                <Input
                  value={confirmReset}
                  onChange={(e) => setConfirmReset(e.target.value)}
                  placeholder="LÖSCHEN"
                  disabled={isDemoMode}
                  className="bg-[var(--background)] border-[#ff716c]/20 rounded-xl h-12 text-[#ff716c] focus:border-[#ff716c] font-black uppercase"
                />
              </div>

              {resetStatus && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold border ${
                  resetStatus.type === 'success' ? 'bg-[#2FF801]/10 border-[#2FF801]/20 text-[#2FF801]' : 'bg-[#ff716c]/10 border-[#ff716c]/20 text-[#ff716c]'
                }`}>
                  <span>{resetStatus.msg}</span>
                </div>
              )}

              <Button
                onClick={handleResetAccount}
                disabled={isResetting || confirmReset !== "LÖSCHEN" || isDemoMode}
                className="w-full h-14 bg-[#ff716c] hover:bg-[#ff716c]/80 text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,113,108,0.2)]"
              >
                {isResetting ? <Loader2 className="animate-spin" size={18} /> : "Account komplett zurücksetzen"}
              </Button>
            </div>
          </Card>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
