"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, LogIn, Mail, Lock, UserPlus, AlertCircle } from "lucide-react";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { AgeGate, useAgeVerified } from "@/components/age-gate";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("signup") === "true") {
      setIsSignUp(true);
    }
  }, [searchParams]);

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
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: username.trim().toLowerCase().replace(/\s+/g, "_"),
        display_name: username.trim(),
        has_completed_onboarding: false,
      });

      if (data.session === null) {
        setSuccess("Konto erstellt! Bitte checke deine Mails.");
      } else {
        setSuccess("Konto erfolgreich erstellt! Du wirst eingeloggt...");
        setTimeout(() => router.push("/"), 1500);
      }
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="w-32 h-32 relative mx-auto mb-4 drop-shadow-2xl">
          <img src="/logo.png" alt="CannaLog Logo" className="w-full h-full object-contain" />
        </div>
        <span className="text-[12px] text-[#00F5FF] tracking-[0.5em] font-bold uppercase">CannaLog</span>
        <h1 className="text-3xl font-black uppercase italic tracking-tight mt-2 font-display">{isSignUp ? "Konto erstellen" : "Willkommen"}</h1>
        <p className="text-[var(--muted-foreground)] mt-2">{isSignUp ? "Wähle deinen Benutzernamen und leg los." : "Deine Reise zur perfekten Sammlung beginnt hier."}</p>
      </div>

      <Card className="p-6 bg-[var(--card)] border-[var(--border)]/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00F5FF]/10 blur-3xl rounded-full" />

        <form onSubmit={isSignUp ? undefined : handleLogin} className="space-y-4 relative z-10">
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest ml-1 font-mono">Benutzername</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-3 text-[var(--muted-foreground)]" size={18} />
                <Input
                  type="text"
                  placeholder="dein_name"
                  className="bg-[var(--input)] border border-[var(--border)]/50 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest ml-1 font-mono">Terminal Access: User ID</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[var(--muted-foreground)]" size={18} />
              <Input
                type="email"
                placeholder="name@example.com"
                className="bg-[var(--input)] border border-[var(--border)]/50 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest ml-1 font-mono">Terminal Access: Passcode</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-[var(--muted-foreground)]" size={18} />
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-[var(--input)] border border-[var(--border)]/50 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
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
              <div className="flex-grow border-t border-[var(--border)]"></div>
              <span className="flex-shrink mx-4 text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-widest">OR</span>
              <div className="flex-grow border-t border-[var(--border)]"></div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={toggleMode}
              disabled={loading}
              className="w-full h-12 text-[var(--muted-foreground)] hover:text-[#2FF801] hover:bg-[#2FF801]/5 border border-transparent hover:border-[#2FF801]/20 transition-all uppercase text-[10px] font-bold tracking-widest"
            >
              {isSignUp ? <><LogIn size={16} className="mr-2" /> Zurück zum Login</> : <><UserPlus size={16} className="mr-2" /> Neues Konto erstellen</>}
            </Button>
          </div>
        </form>
      </Card>

      <button
          type="button"
          onClick={() => setForgotPasswordOpen(true)}
          className="text-center text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.2em] hover:text-[#00F5FF] transition-colors"
        >
          Passwort vergessen?
        </button>

      <p className="text-center text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.3em]">Authorized Access Only</p>

      <ForgotPasswordDialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </div>
  );
}

export default function LoginPage() {
  const { verified: ageVerified } = useAgeVerified();

  if (ageVerified === null) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade...</p>
        </div>
      </main>
    );
  }

  if (!ageVerified) {
    return <AgeGate onVerified={() => {}} />;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#2FF801]/5 blur-[120px] rounded-full" />
      </div>
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade Login-Interface...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
