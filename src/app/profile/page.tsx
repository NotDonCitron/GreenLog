"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, Award, History, Heart, FlaskConical, ShieldCheck, Palette, ExternalLink, Camera, Monitor, Zap, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const { user, signOut, loading, isDemoMode, setDemoMode } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalStrains: 0,
    xp: 0,
    level: 1,
    progressToNextLevel: 0
  });
  const [fetchingStats, setFetchingStats] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (isDemoMode) {
        setStats({ totalStrains: 12, xp: 850, level: 4, progressToNextLevel: 65 });
        setFetchingStats(false);
        return;
      }

      if (!user) {
        setFetchingStats(false);
        return;
      }

      // Echte Daten aus Supabase abrufen
      const { count, error } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const strainCount = count || 0;
      const totalXp = strainCount * 50; // 50 XP pro Strain
      const currentLevel = Math.floor(totalXp / 100) + 1;
      const progress = totalXp % 100;

      setStats({
        totalStrains: strainCount,
        xp: totalXp,
        level: currentLevel,
        progressToNextLevel: progress
      });
      setFetchingStats(false);
    }
    fetchStats();
  }, [user, isDemoMode]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-24">
      {/* Profile Header with XP Bar */}
      <div className="p-8 pt-12 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-[#00F5FF]/5 to-transparent text-center">
        <div className="relative mb-4">
          <div className={`absolute inset-0 blur-3xl opacity-30 rounded-full ${isDemoMode ? 'bg-[#2FF801]' : 'bg-[#00F5FF]'}`} />
          <Avatar className={`w-28 h-24 border-2 p-1 bg-black relative ${isDemoMode ? 'border-[#2FF801]' : 'border-[#00F5FF]/50'}`}>
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || "demo"}`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-2 right-0 px-3 py-1 rounded-full text-[10px] font-black border-2 border-[#0e0e0f] shadow-xl ${isDemoMode ? 'bg-[#2FF801] text-black' : 'bg-[#00F5FF] text-black'}`}>
            LVL {stats.level}
          </div>
        </div>

        <h2 className="text-2xl font-black italic tracking-tighter uppercase">
          {isDemoMode ? "Demo Operator" : (user?.email?.split("@")[0] || "Guest")}
        </h2>
        
        {/* XP Progress Bar */}
        <div className="w-full max-w-[200px] mt-6 space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
            <span>XP: {stats.xp}</span>
            <span>Next Level</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-1000 ${isDemoMode ? 'bg-[#2FF801]' : 'bg-[#00F5FF]'}`}
              style={{ width: `${stats.progressToNextLevel}%` }}
            />
          </div>
        </div>

        <div className="flex gap-8 mt-8">
          <div className="text-center">
            <p className={`text-xl font-black ${isDemoMode ? 'text-[#2FF801]' : 'text-[#00F5FF]'}`}>{stats.totalStrains}</p>
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Strains</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-black text-white">0</p>
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Grows</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-black text-yellow-500">0</p>
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Badges</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Team Feedback Area */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-[#00F5FF] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Palette size={12} /> Team Feedback Area
          </h3>
          <div className="grid gap-3">
            <Link href="/designs.html" target="_blank">
              <Card className="p-4 bg-[#1a191b] border-[#00F5FF]/20 hover:border-[#00F5FF]/50 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00F5FF]/10 rounded-xl flex items-center justify-center text-[#00F5FF]"><Palette size={20} /></div>
                    <div><p className="text-xs font-black uppercase tracking-widest text-white">Design Konzepte</p><p className="text-[9px] text-white/40 uppercase">24 Varianten anschauen</p></div>
                  </div>
                  <ExternalLink size={14} className="text-white/20 group-hover:text-[#00F5FF]" />
                </div>
              </Card>
            </Link>
            <Card className="p-5 bg-[#1a191b] border-[#2FF801]/20">
              <div className="flex items-center gap-3 mb-4 text-[#2FF801]"><Camera size={20} /><p className="text-xs font-black uppercase tracking-widest">Scanner Testen</p></div>
              <div className="space-y-3 mb-5">
                <div className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#2FF801] border border-[#2FF801]/20">1</div><p className="text-[10px] text-white/60 leading-tight">Öffne den Link unten auf einem <strong className="text-white">PC</strong>.</p></div>
                <div className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#2FF801] border border-[#2FF801]/20">2</div><p className="text-[10px] text-white/60 leading-tight">Ziele mit diesem Handy-Scanner darauf.</p></div>
              </div>
              <Link href="/scanner/test" target="_blank"><button className="w-full py-3 bg-[#2FF801]/10 border border-[#2FF801]/30 rounded-xl text-[#2FF801] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#2FF801]/20 transition-all flex items-center justify-center gap-2"><Monitor size={14} /> Test-Zentrum öffnen</button></Link>
            </Card>
          </div>
        </section>

        {/* Demo Mode Toggle */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">System</h3>
          <Card className={`p-4 bg-[#1a191b] border-white/5 transition-all ${isDemoMode ? 'border-[#2FF801]/30 bg-[#2FF801]/5' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDemoMode ? 'bg-[#2FF801]/20 text-[#2FF801]' : 'bg-white/5 text-white/40'}`}><FlaskConical size={20} /></div>
                <div><p className="text-sm font-bold uppercase tracking-tight">Demo Modus</p><p className="text-[10px] text-white/40 uppercase">Simuliert volle Datenbank</p></div>
              </div>
              <button onClick={() => setDemoMode(!isDemoMode)} className={`w-12 h-6 rounded-full transition-all relative ${isDemoMode ? 'bg-[#2FF801]' : 'bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDemoMode ? 'left-7' : 'left-1'}`} /></button>
            </div>
          </Card>
        </section>

        {/* Action List */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 mb-2">Einstellungen</h3>
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><div className="flex items-center gap-3"><Trophy size={18} className="text-yellow-500" /><span className="text-sm font-medium">Erfolge (Badges)</span></div><span className="text-xs text-white/20">0</span></button>
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><div className="flex items-center gap-3"><Settings size={18} className="text-white/40" /><span className="text-sm font-medium">Account Settings</span></div><span className="text-xs text-white/20">→</span></button>
          {user && <button onClick={handleSignOut} className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-red-500 mt-4"><div className="flex items-center gap-3"><LogOut size={18} /><span className="text-sm font-medium uppercase font-bold tracking-widest text-[10px]">Logout Terminal</span></div></button>}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
