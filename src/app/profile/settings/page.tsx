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
  UserRound
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
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setDisplayName(data.display_name || "");
        setUsername(data.username || "");
      }
    }
    getProfile();
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
    } catch (err: any) {
      setProfileStatus({ type: 'error', msg: err.message });
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
    } catch (err: any) {
      setEmailStatus({ type: 'error', msg: `${err.message}` });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleResetAccount = async () => {
    if (confirmReset !== "LÖSCHEN" || isDemoMode) return;
    
    setIsResetting(true);
    setResetStatus(null);
    
    try {
      // 1. Delete all user data
      const userId = user?.id;
      if (!userId) throw new Error("Nicht eingeloggt");

      // Wir löschen alle verknüpften Daten (Tabellen mit user_id)
      const tables = ['user_collection', 'user_strain_relations', 'ratings', 'user_activities', 'user_badges', 'follows', 'follow_requests', 'grows'];
      
      for (const table of tables) {
        // Bei follows und follow_requests müssen wir ggf. beide Spalten prüfen
        if (table === 'follows') {
            await supabase.from(table).delete().eq('follower_id', userId);
            await supabase.from(table).delete().eq('following_id', userId);
        } else if (table === 'follow_requests') {
            await supabase.from(table).delete().eq('requester_id', userId);
            await supabase.from(table).delete().eq('target_id', userId);
        } else {
            await supabase.from(table).delete().eq('user_id', userId);
        }
      }

      // Profile löschen (optional, aber konsequent)
      await supabase.from('profiles').delete().eq('id', userId);

      setResetStatus({ type: 'success', msg: "Account-Daten wurden erfolgreich zurückgesetzt." });
      
      // Nach kurzem Delay ausloggen
      setTimeout(async () => {
        await signOut();
        router.push("/login");
      }, 2000);

    } catch (err: any) {
      setResetStatus({ type: 'error', msg: err.message });
      setIsResetting(false);
    }
  };

  if (!user && !isDemoMode) {
    router.push("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-white text-black pb-32">
      <header className="p-8 pb-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-black/5 border border-black/10">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">Account</p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-black">Einstellungen</h1>
        </div>
      </header>

      <div className="px-8 space-y-8 mt-6">
        {/* Profil bearbeiten */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <UserRound size={16} className="text-[#2FF801]" />
            <h2 className="text-xs font-black uppercase tracking-widest">Profil-Informationen</h2>
          </div>
          
          <Card className="bg-[#1e3a24] border-black/10 p-6 rounded-[2rem] space-y-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Anzeigename</Label>
                <Input 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="z.B. Pascal"
                  className="bg-black/20 border-black/10 rounded-xl h-12 focus:border-[#2FF801]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Benutzername (@)</Label>
                <Input 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="benutzername"
                  className="bg-black/20 border-black/10 rounded-xl h-12 focus:border-[#2FF801] font-mono text-sm"
                />
              </div>

              {profileStatus && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold border ${
                  profileStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
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
          
          <Card className="bg-[#1e3a24] border-black/10 p-6 rounded-[2rem] space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">Aktuelle E-Mail</p>
              <p className="text-sm font-bold text-black/80">{user?.email || "Demo Modus"}</p>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Neue E-Mail</Label>
                <Input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@neu.de"
                  disabled={isDemoMode}
                  className="bg-black/20 border-black/10 rounded-xl h-12 focus:border-[#00F5FF]"
                />
              </div>

              {emailStatus && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold uppercase tracking-tight border ${
                  emailStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
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
              {isDemoMode && <p className="text-[8px] text-center text-black/20 italic">Im Demo-Modus deaktiviert</p>}
            </form>
          </Card>
        </section>

        {/* Passwort ändern (Hinweis auf Login-Reset) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Lock size={16} className="text-[#fbbf24]" />
            <h2 className="text-xs font-black uppercase tracking-widest">Passwort</h2>
          </div>
          <Card className="bg-[#1e3a24] border-black/10 p-6 rounded-[2rem]">
             <p className="text-xs text-black/60 leading-relaxed">
               Um dein Passwort zu ändern, logge dich aus und nutze die "Passwort vergessen" Funktion im Login-Terminal.
             </p>
          </Card>
        </section>

        {/* Account zurücksetzen */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Trash2 size={16} className="text-red-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-red-500">Gefahrenzone</h2>
          </div>
          
          <Card className="bg-red-500/5 border-red-500/20 p-6 rounded-[2rem] space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-red-500">Daten zurücksetzen</h3>
              <p className="text-xs text-black/40 leading-relaxed">
                Dies löscht unwiderruflich alle deine gesammelten Strains, Grows, Badges und dein Profil. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest ml-1">Tippe "LÖSCHEN" zur Bestätigung</Label>
                <Input 
                  value={confirmReset}
                  onChange={(e) => setConfirmReset(e.target.value)}
                  placeholder="LÖSCHEN"
                  disabled={isDemoMode}
                  className="bg-black/20 border-red-500/10 rounded-xl h-12 text-red-500 focus:border-red-500 font-black uppercase"
                />
              </div>

              {resetStatus && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold border ${
                  resetStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                  <span>{resetStatus.msg}</span>
                </div>
              )}

              <Button 
                onClick={handleResetAccount}
                disabled={isResetting || confirmReset !== "LÖSCHEN" || isDemoMode}
                variant="destructive"
                className="w-full h-14 bg-red-600 hover:bg-red-700 text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)]"
              >
                {isResetting ? <Loader2 className="animate-spin" size={18} /> : "ACCOUNT KOMPLETT ZURÜCKSETZEN"}
              </Button>
            </div>
          </Card>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
