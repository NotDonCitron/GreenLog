"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refreshMemberships } = useAuth();

  useEffect(() => {
    // Supabase handles the token from URL fragment automatically via getSession
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Token will be available once user visits the page
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign in with the new password
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    if (email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        router.push("/login?reset=success");
        return;
      }

      await refreshMemberships();
      router.push("/");
      router.refresh();
    } else {
      router.push("/login?reset=success");
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <img src="/logo-transparent.png" alt="CannaLog Logo" className="w-32 h-32 mx-auto mb-4 object-contain drop-shadow-2xl" />
        <span className="text-[12px] text-[#00F5FF] tracking-[0.5em] font-bold uppercase">CannaLog</span>
        <h1 className="text-3xl font-bold text-black mt-2">Neues Passwort</h1>
        <p className="text-black/40 mt-2">Gib dein neues Passwort ein.</p>
      </div>

      <Card className="p-6 bg-white border-black/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00F5FF]/10 blur-3xl rounded-full" />

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 font-mono">
              Neues Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-black/20" size={18} />
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-black/5 border-black/10 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-black placeholder:text-black/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 font-mono">
              Passwort bestätigen
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-black/20" size={18} />
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-black/5 border-black/10 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-black placeholder:text-black/10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#00F5FF] text-black font-black hover:bg-[#00F5FF]/80 transition-all tracking-widest"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Passwort setzen"}
          </Button>

          <div className="text-center">
            <a
              href="/login"
              className="text-[10px] text-black/30 hover:text-[#00F5FF] uppercase tracking-widest transition-colors"
            >
              Zurück zum Login
            </a>
          </div>
        </form>
      </Card>

      <p className="text-center text-[10px] text-black/20 uppercase tracking-[0.3em]">Authorized Access Only</p>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">Lade...</p>
        </div>
      }>
        <UpdatePasswordForm />
      </Suspense>
    </main>
  );
}