"use client";

import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, Award, History, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading) return null;

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-24">
      {/* Profile Header */}
      <div className="p-8 pt-12 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-[#00F5FF]/5 to-transparent">
        <div className="relative">
          <div className="absolute inset-0 bg-[#00F5FF] blur-2xl opacity-20 rounded-full" />
          <Avatar className="w-24 h-24 border-2 border-[#00F5FF]/50 p-1 bg-black relative">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
            <AvatarFallback>{user.email?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <h2 className="text-2xl font-bold mt-4 uppercase tracking-tight">{user.email?.split("@")[0]}</h2>
        <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">{user.email}</p>
        
        <div className="flex gap-4 mt-6">
          <div className="text-center">
            <p className="text-lg font-bold text-[#00F5FF]">12</p>
            <p className="text-[10px] text-white/40 uppercase tracking-tighter">Strains</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-bold text-[#2FF801]">4</p>
            <p className="text-[10px] text-white/40 uppercase tracking-tighter">Level</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-bold text-white">850</p>
            <p className="text-[10px] text-white/40 uppercase tracking-tighter">Punkte</p>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-[#1a191b] border-white/5 flex flex-col items-center gap-2 hover:border-[#00F5FF]/30 transition-all cursor-pointer">
            <Award className="text-[#00F5FF]" size={24} />
            <span className="text-[10px] font-bold uppercase">Erfolge</span>
          </Card>
          <Card className="p-4 bg-[#1a191b] border-white/5 flex flex-col items-center gap-2 hover:border-[#2FF801]/30 transition-all cursor-pointer">
            <History className="text-[#2FF801]" size={24} />
            <span className="text-[10px] font-bold uppercase">History</span>
          </Card>
        </div>

        <div className="space-y-2 pt-4">
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

          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-red-500"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} />
              <span className="text-sm font-medium">Ausloggen</span>
            </div>
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
