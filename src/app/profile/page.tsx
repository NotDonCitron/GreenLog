"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Camera,
  Eye,
  EyeOff,
  Globe2,
  Heart,
  Leaf,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Trophy,
  UserRound,
  Users,
  Wand2,
  Zap,
  Calendar,
  Check,
  X
} from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { FollowersListModal } from "@/components/social/followers-list-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type {
  ProfileActivityItem,
  ProfileBadge,
  ProfileFavorite,
  ProfileIdentity,
  ProfileStats,
  ProfileViewModel,
  PublicProfilePreview,
  Strain,
} from "@/lib/types";

const BADGE_ICONS: Record<string, LucideIcon> = {
  starter: Sprout,
  connoisseur: Trophy,
  highflyer: Zap,
  leaf: Leaf,
  dna: Sparkles,
  moon: Sparkles,
  sun: Sparkles,
  flaskconical: Sparkles,
  database: Shield,
};

function getInitials(value: string) {
  const cleaned = value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return cleaned || "CU";
}

function formatThcDisplay(strain: any) {
  if (!strain) return "Keine Daten";
  return `${strain.avg_thc || strain.thc_max || "—"}% THC`;
}

function resolveBadgeIcon(iconKey: string) {
  const normalized = iconKey.toLowerCase();
  const matchedKey = Object.keys(BADGE_ICONS).find((key) => normalized.includes(key));
  return matchedKey ? BADGE_ICONS[matchedKey] : Trophy;
}

function createFallbackViewModel(isDemoMode: boolean): ProfileViewModel {
  const stats: ProfileStats = { totalStrains: 0, totalGrows: 0, favoriteCount: 0, unlockedBadgeCount: 0, xp: 0, level: 1, progressToNextLevel: 0, followers: 0, following: 0 };
  return {
    identity: { email: null, username: "@guest", displayName: "Guest", initials: "GU", profileVisibility: "private", tagline: "", bio: null },
    stats,
    favorites: [],
    badges: [],
    activity: [],
    preview: { title: "Privat", description: "", chips: [] }
  };
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-1 px-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#A3E4D7]/70">{eyebrow}</p>
      <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
    </div>
  );
}

export default function ProfilePage() {
  const { user, signOut, loading, isDemoMode } = useAuth();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [viewModel, setViewModel] = useState<ProfileViewModel>(() => createFallbackViewModel(false));
  const [pageState, setPageState] = useState<"loading" | "ready" | "error">("loading");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ displayName: "", bio: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [followersModal, setFollowersModal] = useState<{ isOpen: boolean; mode: "followers" | "following" }>({ isOpen: false, mode: "followers" });
  const currentUserId = user?.id ?? "";

  const fetchProfile = async () => {
    if (!user && !isDemoMode) { setPageState("ready"); return; }
    try {
      const [profileRes, collCount, followersRes, followingRes, favsRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user?.id).single(),
        supabase.from("user_collection").select("*", { count: "exact", head: true }).eq("user_id", user?.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user?.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user?.id),
        supabase.from("user_strain_relations").select("favorite_rank, strains(*)").eq("user_id", user?.id).eq("is_favorite", true).limit(5),
        supabase.from("user_badges").select("badges(*)").eq("user_id", user?.id)
      ]);

      const stats: ProfileStats = {
        totalStrains: collCount.count ?? 0,
        totalGrows: 0,
        favoriteCount: favsRes.data?.length ?? 0,
        unlockedBadgeCount: badgesRes.data?.length ?? 0,
        xp: (collCount.count ?? 0) * 50,
        level: Math.floor(((collCount.count ?? 0) * 50) / 100) + 1,
        progressToNextLevel: ((collCount.count ?? 0) * 50) % 100,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0
      };

      const favorites: ProfileFavorite[] = (favsRes.data || []).map(f => {
        const s = f.strains as any;
        if (!s) return null;
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          imageUrl: s.image_url,
          type: s.type,
          thcDisplay: formatThcDisplay(s),
          favoriteRank: f.favorite_rank
        };
      }).filter((f): f is ProfileFavorite => !!f);

      const badges: ProfileBadge[] = (badgesRes.data || []).map(b => {
        const badge = (b as any).badges;
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          iconKey: badge.icon_url || "starter",
          rarity: badge.rarity || "common"
        };
      });
      const identity: ProfileIdentity = {
        email: user?.email ?? null,
        username: `@${profileRes.data?.username || "user"}`,
        displayName: profileRes.data?.display_name || "CannaLog User",
        initials: getInitials(profileRes.data?.display_name || "CU"),
        avatarUrl: profileRes.data?.avatar_url || null,
        profileVisibility: profileRes.data?.profile_visibility || "private",
        tagline: "",
        bio: profileRes.data?.bio || null
      };

      setViewModel({ identity, stats, favorites, badges, activity: [], preview: { title: "", description: "", chips: [] } });
      setEditData({ displayName: identity.displayName, bio: identity.bio || "" });
      setPageState("ready");
    } catch (e) { console.error(e); setPageState("error"); }
  };

  useEffect(() => {
    if (!loading) fetchProfile();
  }, [user, loading, isDemoMode]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editData.displayName,
          bio: editData.bio
        })
        .eq("id", user.id);

      if (error) throw error;
      await fetchProfile();
      setIsEditing(false);
    } catch (e) {
      console.error("Error saving profile:", e);
    } finally {
      setIsSaving(false);
    }
  };

  if (pageState === "loading") return <div className="min-h-screen bg-[#355E3B] flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;

  const { identity, stats, favorites, badges } = viewModel;
  const isPublic = identity.profileVisibility === "public";

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">My Profile</p>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">CannaLog</h1>
          </div>
          <button onClick={() => signOut()} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-red-400">
            <LogOut size={18} />
          </button>
        </div>

        <div className="bg-[#1e3a24] rounded-[2.5rem] p-6 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,245,255,0.05),transparent_50%)]" />
          
          <div className="flex items-start gap-6 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-black/20 bg-black/40 flex items-center justify-center">
                {identity.avatarUrl ? (
                  <img src={identity.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-white/20">{identity.initials}</span>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#2FF801] text-black flex items-center justify-center border-4 border-[#1e3a24]">
                <Camera size={14} />
              </button>
            </div>

            <div className="flex-1 pt-2">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setFollowersModal({ isOpen: true, mode: "followers" })} className="text-center">
                  <p className="text-xl font-black">{stats.followers}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Follower</p>
                </button>
                <button onClick={() => setFollowersModal({ isOpen: true, mode: "following" })} className="text-center">
                  <p className="text-xl font-black">{stats.following}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Following</p>
                </button>
                <div className="text-center">
                  <p className="text-xl font-black">{stats.totalStrains}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Strains</p>
                </div>
              </div>
              
              {isEditing ? (
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 py-2 bg-[#2FF801] text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Save</>}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="w-10 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                  Profil bearbeiten
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3 relative z-10">
            {isEditing ? (
              <div className="space-y-3">
                <input 
                  value={editData.displayName} 
                  onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                  placeholder="Anzeigename"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:border-[#2FF801] outline-none"
                />
                <textarea 
                  value={editData.bio} 
                  onChange={(e) => setEditData({...editData, bio: e.target.value})}
                  placeholder="Deine Bio / Caption..."
                  rows={2}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:border-[#2FF801] outline-none resize-none"
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black uppercase tracking-tight">{identity.displayName}</h2>
                <p className="text-xs text-[#2FF801] font-bold tracking-widest">{identity.username}</p>
                {identity.bio && <p className="text-sm text-white/60 mt-2 leading-relaxed">{identity.bio}</p>}
              </>
            )}
          </div>

          <div className="mt-4 flex gap-4 text-[10px] font-bold text-white/40 uppercase tracking-widest relative z-10">
             <span className="flex items-center gap-1"><Calendar size={12} /> Joined March 2026</span>
          </div>
        </div>
      </header>

      <div className="px-8 space-y-10">
        <section className="bg-[#1e3a24] rounded-[2rem] p-6 border border-white/10 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Level {stats.level} Progress</span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#2FF801]">{stats.progressToNextLevel}% XP</span>
          </div>
          <div className="h-3 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div className="h-full bg-gradient-to-r from-[#2FF801] to-[#00F5FF] rounded-full shadow-[0_0_10px_#2FF801]" style={{ width: `${stats.progressToNextLevel}%` }} />
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-6">
            <SectionHeader eyebrow="Achievements" title="Abzeichen" />
            <span className="text-[10px] font-bold text-[#00F5FF]">Katalog</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "starter", name: "Starter", req: "1 Strain geloggt", icon: Sprout, threshold: 1 },
              { id: "connoisseur", name: "Collector", req: "5 Strains gesammelt", icon: Trophy, threshold: 5 },
              { id: "grower", name: "Grower", req: "1 Grow gestartet", icon: Leaf, threshold: 1 },
              { id: "social", name: "Social", req: "1 Freund gefolgt", icon: Users, threshold: 1 }
            ].map((b) => {
              const meetsThreshold = (b.id === 'starter' && stats.totalStrains >= 1) || 
                                     (b.id === 'connoisseur' && stats.totalStrains >= 5) ||
                                     (b.id === 'social' && stats.following >= 1);
              const isUnlocked = meetsThreshold;

              return (
                <div key={b.id} className={`rounded-3xl p-4 flex flex-col items-center text-center gap-2 transition-all border ${
                  isUnlocked 
                  ? "bg-[#1e3a24] border-[#2FF801]/30" 
                  : "bg-black/20 border-white/5 opacity-40 grayscale"
                }`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 ${
                    isUnlocked ? "bg-[#2FF801]/10 text-[#ffd76a]" : "bg-white/5 text-white/10"
                  }`}>
                    <b.icon size={32} />
                  </div>
                  <p className={`text-[11px] font-black uppercase tracking-tight leading-none ${
                    isUnlocked ? "text-white" : "text-white/40"
                  }`}>{b.name}</p>
                  <p className={`text-[8px] font-bold uppercase tracking-tighter ${
                    isUnlocked ? "text-[#2FF801]" : "text-white/20"
                  }`}>
                    {isUnlocked ? b.req : `Ziel: ${b.req}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader eyebrow="Collection" title="Kuratierte Highlights" />
          {favorites.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {favorites.map((favorite) => (
                <Link key={favorite.id} href={`/strains/${favorite.slug}`} className="min-w-[220px] flex-shrink-0">
                  <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#1e3a24] p-0 shadow-lg hover:border-[#00F5FF]/30 transition-all">
                    <div className="relative h-40 w-full">
                      <Image src={favorite.imageUrl || "/strains/placeholder-1.svg"} alt={favorite.name} fill className="object-cover opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a24] to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-sm font-black uppercase tracking-tight truncate">{favorite.name}</p>
                        <p className="text-[10px] text-[#00F5FF] font-bold">{favorite.thcDisplay}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center bg-black/10 rounded-[2rem] border border-dashed border-white/10 text-white/20 text-xs font-bold uppercase tracking-widest">Keine Favoriten gesetzt</div>
          )}
        </section>

        <section className="bg-black/20 rounded-[2rem] p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-widest">Profil Sichtbarkeit</h3>
              <p className="text-[10px] text-white/40">{isPublic ? "Dein Profil ist für alle sichtbar" : "Nur du siehst dein Profil"}</p>
            </div>
            <button className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${isPublic ? 'bg-[#2FF801]/10 border-[#2FF801]/30 text-[#2FF801]' : 'bg-white/5 border-white/10 text-white/40'}`}>
              {isPublic ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </section>
      </div>

      <FollowersListModal isOpen={followersModal.isOpen} onClose={() => setFollowersModal((prev) => ({ ...prev, isOpen: false }))} mode={followersModal.mode} userId={currentUserId} />
      <BottomNav />
    </main>
  );
}
