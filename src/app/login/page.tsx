"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, LogIn, Mail, Lock, UserPlus, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email oder Passwort falsch." : error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
  };

  const handleSignUp = async () => {
    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (!username.trim()) {
      setError("Bitte gib einen Benutzernamen ein.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      // Update profile with username and display_name
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: username.trim().toLowerCase().replace(/\s+/g, "_"),
        display_name: username.trim(),
      });

      if (data.session === null) {
        setSuccess("Konto erstellt! Bitte checke deine Mails (oder schalte 'Confirm Email' in Supabase aus).");
      } else {
        setSuccess("Konto erfolgreich erstellt! Du wirst eingeloggt...");
        setTimeout(() => router.push("/"), 1500);
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#355E3B] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <span className="text-[12px] text-[#00F5FF] tracking-[0.5em] font-bold uppercase">CannaLog</span>
          <h1 className="text-3xl font-bold text-white mt-2">{isSignUp ? "Konto erstellen" : "Willkommen"}</h1>
          <p className="text-white/40 mt-2">{isSignUp ? "Wähle deinen Benutzernamen und leg los." : "Deine Reise zur perfekten Sammlung beginnt hier."}</p>
        </div>

        <Card className="p-6 bg-[#1a191b] border-white/10 shadow-2xl relative overflow-hidden">
          {/* Accent Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00F5FF]/10 blur-3xl rounded-full" />

          <form onSubmit={isSignUp ? undefined : handleLogin} className="space-y-4 relative z-10">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1 font-mono">Benutzername</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-3 text-white/20" size={18} />
                  <Input
                    type="text"
                    placeholder="dein_name"
                    className="bg-black/40 border-white/5 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-white placeholder:text-white/10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1 font-mono">Terminal Access: User ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-white/20" size={18} />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="bg-black/40 border-white/5 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-white placeholder:text-white/10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1 font-mono">Terminal Access: Passcode</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-white/20" size={18} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="bg-black/40 border-white/5 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-white placeholder:text-white/10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-500 text-xs">
                <AlertCircle size={14} />
                {success}
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <Button
                type={isSignUp ? "button" : "submit"}
                onClick={isSignUp ? handleSignUp : undefined}
                disabled={loading}
                className="w-full h-12 bg-[#00F5FF] text-black font-black hover:bg-[#00F5FF]/80 transition-all tracking-widest"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <div className="flex items-center gap-2">
                    {isSignUp ? <><UserPlus size={18} /> KONTO ERSTELLEN</> : <><LogIn size={18} /> INITIALIZE LOGIN</>}
                  </div>
                )}
              </Button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] text-white/20 uppercase font-bold tracking-widest">OR</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={toggleMode}
                disabled={loading}
                className="w-full h-12 text-white/60 hover:text-[#2FF801] hover:bg-[#2FF801]/5 border border-transparent hover:border-[#2FF801]/20 transition-all uppercase text-[10px] font-bold tracking-widest"
              >
                {isSignUp ? <><LogIn size={16} className="mr-2" /> Zurück zum Login</> : <><UserPlus size={16} className="mr-2" /> Neues Konto erstellen</>}
              </Button>
            </div>
          </form>
        </Card>

        <p className="text-center text-[10px] text-white/20 uppercase tracking-[0.3em]">Authorized Access Only</p>
      </div>
    </main>
  );
}
