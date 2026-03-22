"use client";

import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, Award, History, Heart, FlaskConical, ShieldCheck, Palette, ExternalLink, Camera, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const { user, signOut, loading, isDemoMode, setDemoMode } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-24">
      {/* Profile Header */}
      <div className="p-8 pt-12 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-[#00F5FF]/5 to-transparent text-center">
        <div className="relative">
          <div className={`absolute inset-0 blur-2xl opacity-20 rounded-full ${isDemoMode ? 'bg-[#2FF801]' : 'bg-[#00F5FF]'}`} />
          <Avatar className={`w-24 h-24 border-2 p-1 bg-black relative ${isDemoMode ? 'border-[#2FF801]' : 'border-[#00F5FF]/50'}`}>
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || "demo"}`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          {isDemoMode && (
            <div className="absolute -bottom-2 -right-2 bg-[#2FF801] text-black p-1 rounded-full border-4 border-[#0e0e0f]">
              <ShieldCheck size={16} />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold mt-4 uppercase tracking-tight">
          {isDemoMode ? "Demo Operator" : (user?.email?.split("@")[0] || "Guest")}
        </h2>
        <p className="text-white/40 text-[10px] mt-1 uppercase tracking-[0.3em]">
          {isDemoMode ? "Admin Simulation Active" : (user?.email || "Unauthorized Access")}
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Team Feedback Area (Temporary for Friends) */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-[#00F5FF] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Palette size={12} /> Team Feedback Area
          </h3>
          
          <div className="grid gap-3">
            {/* Design Gallery Link */}
            <Link href="/designs.html" target="_blank">
              <Card className="p-4 bg-[#1a191b] border-[#00F5FF]/20 hover:border-[#00F5FF]/50 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00F5FF]/10 rounded-xl flex items-center justify-center text-[#00F5FF]">
                      <Palette size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white">Design Konzepte</p>
                      <p className="text-[9px] text-white/40 uppercase">24 Varianten anschauen</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-white/20 group-hover:text-[#00F5FF]" />
                </div>
              </Card>
            </Link>

            {/* Scanner Test Tutorial & Link */}
            <Card className="p-5 bg-[#1a191b] border-[#2FF801]/20">
              <div className="flex items-center gap-3 mb-4 text-[#2FF801]">
                <Camera size={20} />
                <p className="text-xs font-black uppercase tracking-widest">Scanner Testen</p>
              </div>
              
              <div className="space-y-3 mb-5">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#2FF801] border border-[#2FF801]/20">1</div>
                  <p className="text-[10px] text-white/60 leading-tight">Öffne den Link unten auf einem <br /><strong className="text-white">ZWEITEN Gerät</strong> (PC/Laptop).</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#2FF801] border border-[#2FF801]/20">2</div>
                  <p className="text-[10px] text-white/60 leading-tight">Ziele mit diesem Handy-Scanner auf <br />eines der Etiketten am Bildschirm.</p>
                </div>
              </div>

              <Link href="/scanner/test" target="_blank">
                <button className="w-full py-3 bg-[#2FF801]/10 border border-[#2FF801]/30 rounded-xl text-[#2FF801] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#2FF801]/20 transition-all flex items-center justify-center gap-2">
                  <Monitor size={14} /> Test-Zentrum öffnen
                </button>
              </Link>
            </Card>
          </div>
        </section>

        {/* Testing Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">Dev Tools & Testing</h3>
          <Card className={`p-4 bg-[#1a191b] border-white/5 transition-all ${isDemoMode ? 'border-[#2FF801]/30 bg-[#2FF801]/5' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDemoMode ? 'bg-[#2FF801]/20 text-[#2FF801]' : 'bg-white/5 text-white/40'}`}>
                  <FlaskConical size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">Demo Modus</p>
                  <p className="text-[10px] text-white/40 uppercase">Simuliert volle Datenbank</p>
                </div>
              </div>
              <button 
                onClick={() => setDemoMode(!isDemoMode)}
                className={`w-12 h-6 rounded-full transition-all relative ${isDemoMode ? 'bg-[#2FF801]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDemoMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </Card>
        </section>

        {/* Action List */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 mb-2">Einstellungen</h3>
          
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <Heart size={18} className="text-red-500" />
              <span className="text-sm font-medium">Favoriten</span>
            </div>
            <span className="text-xs text-white/20">→</span>
          </button>

          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-white/40" />
              <span className="text-sm font-medium">Account Settings</span>
            </div>
            <span className="text-xs text-white/20">→</span>
          </button>

          {user && (
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-red-500 mt-4"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} />
                <span className="text-sm font-medium uppercase font-bold tracking-widest text-[10px]">Logout Terminal</span>
              </div>
            </button>
          )}
          
          {!user && (
            <button 
              onClick={() => router.push("/login")}
              className="w-full flex items-center justify-center p-4 rounded-xl bg-[#00F5FF] text-black font-bold uppercase tracking-widest text-xs mt-4"
            >
              Einloggen
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
