"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, LogIn, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      alert("Check your email for the confirmation link!");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0e0e0f] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <span className="text-[12px] text-[#00F5FF] tracking-[0.5em] font-bold uppercase">Cannalog</span>
          <h1 className="text-3xl font-bold text-white mt-2">Willkommen zurück</h1>
          <p className="text-white/40 mt-2">Logge dich ein, um deine Sammlung zu verwalten.</p>
        </div>

        <Card className="p-6 bg-[#1a191b] border-white/10 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-white/20" size={18} />
                <Input 
                  type="email" 
                  placeholder="name@example.com" 
                  className="bg-black/40 border-white/5 pl-10 h-12 focus:border-[#00F5FF]/50 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-widest ml-1">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-white/20" size={18} />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-black/40 border-white/5 pl-10 h-12 focus:border-[#00F5FF]/50 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}

            <div className="pt-4 flex flex-col gap-3">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-[#00F5FF] text-black font-bold hover:bg-[#00F5FF]/80 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <div className="flex items-center gap-2"><LogIn size={18} /> EINLOGGEN</div>}
              </Button>
              
              <Button 
                type="button" 
                variant="ghost"
                onClick={handleSignUp}
                disabled={loading}
                className="w-full h-12 text-white/60 hover:text-white hover:bg-white/5"
              >
                Konto erstellen
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
