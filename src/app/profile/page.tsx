"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, FlaskConical, Palette, ExternalLink, Camera, Monitor, Leaf, Moon, Sun, Dna, Database, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Badge {
  id: string;
  name: string;
  icon: React.ReactNode;
  unlocked: boolean;
  color: string;
}

export default function ProfilePage() {
  const { user, signOut, loading, isDemoMode, setDemoMode } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalStrains: 0,
    totalGrows: 0,
    xp: 0,
    level: 1,
    progressToNextLevel: 0
  });

  const [favorites, setFavorites] = useState<any[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<any[]>([]);

  // Icon mapping for badges
  const IconMap: Record<string, any> = {
    Leaf, Moon, Sun, FlaskConical, Zap, Database, Dna
  };

  useEffect(() => {
    async function fetchStats() {
      if (isDemoMode) {
        setStats({
          totalStrains: 12,
          totalGrows: 5,
          xp: 850,
          level: 4,
          progressToNextLevel: 65
        });
        setUnlockedBadges([
          { name: 'First Bud', icon_url: 'Leaf', unlocked: true },
          { name: 'Hybrid Hunter', icon_url: 'Dna', unlocked: true }
        ]);
        setFavorites([
          { strains: { name: 'Godfather OG', slug: 'godfather-og', image_url: '/strains/godfather-og.jpg' } },
          { strains: { name: 'Animal Face', slug: 'animal-face', image_url: '/strains/animal-face.jpg' } }
        ]);
        return;
      }

      if (!user) return;

      // Fetch favorites
      const { data: favs } = await supabase.from('user_strain_relations').select('*, strains(*)').eq('user_id', user.id).eq('is_favorite', true).limit(5);
      if (favs) setFavorites(favs);

      // Fetch unlocked badges
      const { data: badges } = await supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id);
      if (badges) setUnlockedBadges(badges.map(b => b.badges));

      // Fetch stats
      const { count: strainCount } = await supabase.from('ratings').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: growCount } = await supabase.from('grows').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

      const sCount = strainCount ?? 0;
      const gCount = growCount ?? 0;
      const totalXp = (sCount * 50) + (gCount * 100);
      
      setStats({
        totalStrains: sCount,
        totalGrows: gCount,
        xp: totalXp,
        level: Math.floor(totalXp / 100) + 1,
        progressToNextLevel: totalXp % 100
      });
    }
    fetchStats();
  }, [user, isDemoMode]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* Header with XP */}
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

        <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{isDemoMode ? "Demo Operator" : (user?.email?.split("@")[0] || "Guest")}</h2>
        
        <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-[200px]">
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Strains</p>
            <p className="text-lg font-black italic">{stats.totalStrains}</p>
          </div>
          <div className="text-center border-l border-white/5">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Grows</p>
            <p className="text-lg font-black italic">{stats.totalGrows}</p>
          </div>
        </div>

        <div className="w-full max-w-[200px] mt-8 space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
            <span>XP: {stats.xp}</span>
            <span>Progress</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div className={`h-full transition-all duration-1000 ${isDemoMode ? 'bg-[#2FF801]' : 'bg-[#00F5FF]'}`} style={{ width: `${stats.progressToNextLevel}%` }} />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <section className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-bold text-[#00F5FF] uppercase tracking-[0.2em]">Top 5 Favoriten</h3>
              <Heart size={12} className="text-red-500 animate-pulse" />
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {favorites.map((fav) => (
                <Link key={fav.strains.id || fav.strains.slug} href={`/strains/${fav.strains.slug}`} className="flex-shrink-0">
                  <Card className="w-32 bg-[#1a191b] border-white/5 overflow-hidden group active:scale-95 transition-all">
                    <div className="aspect-square relative">
                      <img src={fav.strains.image_url} alt={fav.strains.name} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <p className="absolute bottom-2 left-2 right-2 text-[9px] font-black uppercase truncate">{fav.strains.name}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Badges Section */}
        <section className=\"space-y-4\">
          <div className=\"flex justify-between items-center px-2\">
            <h3 className=\"text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]\">Erfolge (Badges)</h3>
            <span className=\"text-[10px] font-black text-yellow-500\">{unlockedBadges.length} freigeschaltet</span>
          </div>
          <div className=\"grid grid-cols-2 gap-3\">
            {unlockedBadges.map((badge, idx) => {
              const IconComponent = IconMap[badge.icon_url] || Leaf;
              return (
                <Card key={idx} className=\"p-4 bg-[#1a191b] border-yellow-500/20 bg-yellow-500/5 flex flex-col items-center gap-3 transition-all\">
                  <div className=\"p-3 rounded-2xl bg-black/40 text-yellow-500\"><IconComponent size={20} /></div>
                  <div className=\"text-center\">
                    <p className=\"text-[10px] font-black uppercase tracking-widest leading-none\">{badge.name}</p>
                    <p className=\"text-[8px] text-white/30 uppercase mt-1\">Unlocked</p>
                  </div>
                </Card>
              );
            })}
            {unlockedBadges.length === 0 && (
              <div className=\"col-span-2 py-10 text-center border-2 border-dashed border-white/5 rounded-3xl\">
                <p className=\"text-[10px] font-bold text-white/20 uppercase tracking-widest\">Noch keine Erfolge freigeschaltet</p>
              </div>
            )}
          </div>
        </section>

        {/* Team Feedback Area */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-[#00F5FF] uppercase tracking-[0.2em] px-2 flex items-center gap-2"><Palette size={12} /> Team Feedback Area</h3>
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
              <Link href="/scanner/test" target="_blank"><button className="w-full py-3 bg-[#2FF801]/10 border border-[#2FF801]/30 rounded-xl text-[#2FF801] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#2FF801]/20 transition-all flex items-center justify-center gap-2"><Monitor size={14} /> Test-Zentrum öffnen</button></Link>
            </Card>
          </div>
        </section>

        {/* Dev Tools Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2">Dev Tools & Admin</h3>
          <div className="grid gap-3">
            <Card className={`p-4 bg-[#1a191b] border-white/5 transition-all ${isDemoMode ? 'border-[#2FF801]/30 bg-[#2FF801]/5' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDemoMode ? 'bg-[#2FF801]/20 text-[#2FF801]' : 'bg-white/5 text-white/40'}`}><FlaskConical size={20} /></div>
                  <div><p className="text-sm font-bold uppercase tracking-tight">Demo Modus</p><p className="text-[10px] text-white/40 uppercase">Simulierte Daten</p></div>
                </div>
                <button onClick={() => setDemoMode(!isDemoMode)} className={`w-12 h-6 rounded-full transition-all relative ${isDemoMode ? 'bg-[#2FF801]' : 'bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDemoMode ? 'left-7' : 'left-1'}`} /></button>
              </div>
            </Card>

            <Link href="/admin/seed">
              <Card className="p-4 bg-[#1a191b] border-red-500/20 hover:border-red-500/50 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500"><Database size={20} /></div>
                    <div><p className="text-xs font-black uppercase tracking-widest text-white">Database Seed</p><p className="text-[9px] text-white/40 uppercase">Reset & Reload Legends</p></div>
                  </div>
                  <Database size={14} className="text-white/20 group-hover:text-red-500" />
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* Action List */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 mb-2">Account</h3>
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><div className="flex items-center gap-3"><Settings size={18} className="text-white/40" /><span className="text-sm font-medium">Account Settings</span></div><span className="text-xs text-white/20">→</span></button>
          {user && <button onClick={handleSignOut} className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-red-500 mt-4"><div className="flex items-center gap-3"><LogOut size={18} /><span className="text-sm font-medium uppercase font-bold tracking-widest text-[10px]">Logout Terminal</span></div></button>}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
