"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Loader2, ChevronLeft, Sprout, Calendar, Leaf, Eye,
    Users, MessageSquare, Clock, Droplet, Camera,
    Droplets, Sun
} from "lucide-react";
import Link from "next/link";
import { PhaseBadge } from "@/components/grows";
import type { Grow, Plant, GrowEntry, GrowMilestone, PlantStatus } from "@/lib/types";
import { KCanGDisclaimer } from "@/components/grows/kcan-g-disclaimer";

const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];

const ENTRY_ICONS: Record<string, typeof Droplet> = {
    watering: Droplet,
    feeding: Leaf,
    note: MessageSquare,
    photo: Camera,
    ph_ec: Droplets,
    dli: Sun,
    milestone: Clock,
};

// Group entries by entry_type
function groupEntriesByType(entries: GrowEntry[]): Record<string, GrowEntry[]> {
    const groups: Record<string, GrowEntry[]> = {};
    entries.forEach(entry => {
        const type = entry.entry_type || 'note';
        if (!groups[type]) groups[type] = [];
        groups[type].push(entry);
    });
    return groups;
}

export default function ExploreGrowDetailPage() {
    const { id } = useParams();
    const { user, isDemoMode } = useAuth();

    const [grow, setGrow] = useState<Grow | null>(null);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [entries, setEntries] = useState<GrowEntry[]>([]);
    const [milestones, setMilestones] = useState<GrowMilestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);

    useEffect(() => {
        async function fetchGrowData() {
            if (!id) return;
            setLoading(true);

            try {
                if (isDemoMode) {
                    setGrow({
                        id: id as string,
                        user_id: 'demo-user',
                        organization_id: 'demo-org',
                        title: "Demo Grow",
                        grow_type: "indoor",
                        status: "active",
                        is_public: true,
                        start_date: new Date().toISOString().split('T')[0],
                        strains: { name: "Gorilla Glue #4" }
                    } as Grow);
                    setPlants([]);
                    setEntries([]);
                    setMilestones([]);
                    setFollowerCount(0);
                } else {
                    // Fetch public grow
                    const { data: growData, error: growError } = await supabase
                        .from("grows")
                        .select("*, strains(id, name, slug), profiles:user_id(username, display_name, avatar_url)")
                        .eq("id", id)
                        .eq("is_public", true)
                        .single();

                    if (growError || !growData) {
                        // Grow not found or not public
                        setGrow(null);
                        setLoading(false);
                        return;
                    }

                    setGrow(growData);

                    // Fetch plants
                    const { data: plantsData } = await supabase
                        .from("plants")
                        .select("*")
                        .eq("grow_id", id)
                        .order("created_at", { ascending: true });
                    if (plantsData) setPlants(plantsData);

                    // Fetch entries
                    const { data: entriesData } = await supabase
                        .from("grow_entries")
                        .select("*")
                        .eq("grow_id", id)
                        .order("created_at", { ascending: false });
                    if (entriesData) setEntries(entriesData);

                    // Fetch milestones
                    const { data: milestonesData } = await supabase
                        .from("grow_milestones")
                        .select("*")
                        .eq("grow_id", id)
                        .order("started_at", { ascending: true });
                    if (milestonesData) setMilestones(milestonesData);

                    // Check if user is following
                    if (user) {
                        const { data: followData } = await supabase
                            .from("grow_follows")
                            .select("id")
                            .eq("grow_id", id)
                            .eq("user_id", user.id)
                            .single();
                        setIsFollowing(!!followData);
                    }

                    // Fetch follower count
                    const { count } = await supabase
                        .from("grow_follows")
                        .select("*", { count: 'exact', head: true })
                        .eq("grow_id", id);
                    setFollowerCount(count || 0);
                }
            } catch (err) {
                console.error("Error fetching grow:", err);
                setGrow(null);
            } finally {
                setLoading(false);
            }
        }

        fetchGrowData();
    }, [id, user, isDemoMode]);

    const handleFollowGrow = async () => {
        if (!user || !grow) return;

        try {
            if (isFollowing) {
                await supabase
                    .from("grow_follows")
                    .delete()
                    .eq("grow_id", grow.id)
                    .eq("user_id", user.id);
                setIsFollowing(false);
                setFollowerCount(Math.max(0, followerCount - 1));
            } else {
                await supabase
                    .from("grow_follows")
                    .insert({ grow_id: grow.id, user_id: user.id });
                setIsFollowing(true);
                setFollowerCount(followerCount + 1);
            }
        } catch (err) {
            console.error("Error toggling follow:", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
            </div>
        );
    }

    if (!grow) {
        return (
            <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-[var(--card)] flex items-center justify-center">
                    <Eye size={32} className="text-[#ff716c]" />
                </div>
                <p className="font-bold uppercase tracking-wider">Dieses Grow ist nicht öffentlich</p>
                <Link href="/grows/explore">
                    <Button className="bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black font-black">Zurück zu Entdecken</Button>
                </Link>
            </main>
        );
    }

    const isOwner = user?.id === grow.user_id;
    const groupedEntries = groupEntriesByType(entries);

    return (
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
            </div>

            <header className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4">
                <div className="flex items-center gap-4">
                    <Link href="/grows/explore">
                        <Button variant="ghost" size="icon" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-full transition-all">
                            <ChevronLeft size={24} />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <span className="text-[10px] text-[#2FF801] font-black uppercase tracking-[0.4em]">Öffentliches Grow</span>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">{grow.title}</h1>
                    </div>
                </div>
            </header>

            <div className="p-6 space-y-6 relative z-10">
                {/* KCanG Disclaimer */}
                <KCanGDisclaimer />

                {/* Status Card - Read Only */}
                <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Badge className={grow.status === 'active' ? 'bg-[#2FF801] text-black border-none' : 'bg-[#00F5FF] text-black border-none'}>
                                {grow.status.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                <Eye size={14} />
                                <span className="text-[10px] font-bold uppercase">Öffentlich</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {grow.strains && (
                                <div className="flex items-center gap-2 p-3 bg-[var(--muted)] border border-[var(--border)]/50 rounded-xl">
                                    <Leaf size={16} className="text-[#2FF801]" />
                                    <span className="text-xs font-bold text-[var(--foreground)]">{grow.strains.name}</span>
                                </div>
                            )}
                            {grow.start_date && (
                                <div className="flex items-center gap-2 p-3 bg-[var(--muted)] border border-[var(--border)]/50 rounded-xl">
                                    <Calendar size={16} className="text-[#00F5FF]" />
                                    <span className="text-xs font-bold text-[var(--foreground)]">{grow.start_date}</span>
                                </div>
                            )}
                        </div>

                        <Badge variant="outline" className="border-[var(--border)]/50 text-[var(--muted-foreground)] text-[10px]">
                            {grow.grow_type.toUpperCase()}
                        </Badge>

                        {/* Grow owner */}
                        {grow.profiles && (
                            <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]/50">
                                <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center overflow-hidden">
                                    {grow.profiles.avatar_url ? (
                                        <img src={grow.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-[#00F5FF]">
                                            {grow.profiles.username?.[0]?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-[var(--foreground)]">
                                        {grow.profiles.display_name || grow.profiles.username}
                                    </span>
                                    <span className="text-[10px] text-[var(--muted-foreground)] ml-2">@{grow.profiles.username}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Follow Section */}
                <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                            <Users size={16} />
                            <span className="text-xs font-bold">{followerCount} Follower</span>
                        </div>
                        {user && !isOwner && (
                            <Button
                                onClick={handleFollowGrow}
                                size="sm"
                                className={isFollowing ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'bg-[#2FF801] text-black font-black'}
                            >
                                {isFollowing ? 'Folge ich' : 'Folgen'}
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Plants Section - Read Only */}
                {plants.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">Pflanzen</h2>
                        <div className="space-y-3">
                            {plants.map((plant) => {
                                const isActive = ACTIVE_STATUSES.includes(plant.status);
                                return (
                                    <Card key={plant.id} className="bg-[var(--card)] border border-[var(--border)]/50 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sprout size={14} className={isActive ? 'text-[#2FF801]' : 'text-[var(--muted-foreground)]'} />
                                                    <span className="font-bold text-sm text-[var(--foreground)]">{plant.plant_name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <PhaseBadge status={plant.status} />
                                                    <span className="text-[10px] text-[var(--muted-foreground)]">
                                                        Gepflanzt: {new Date(plant.planted_at).toLocaleDateString('de-DE')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Milestones Timeline */}
                {milestones.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">Zeitstrahl</h2>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {milestones.map((milestone, idx) => (
                                <div key={milestone.id} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-[#2FF801]/20 text-[#2FF801]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                                            <Clock size={18} />
                                        </div>
                                        <span className="text-[9px] font-bold uppercase mt-1 whitespace-nowrap">{milestone.phase}</span>
                                    </div>
                                    {idx < milestones.length - 1 && (
                                        <div className={`w-8 h-0.5 ${idx === 0 ? 'bg-[#2FF801]/30' : 'bg-[var(--border)]'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grow Entries by Type - Read Only */}
                {entries.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">Tagebuch</h2>
                        {Object.entries(groupedEntries).map(([type, typeEntries]) => {
                            const IconComponent = ENTRY_ICONS[type] || MessageSquare;
                            return (
                                <div key={type} className="space-y-2">
                                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                        <IconComponent size={14} />
                                        <span className="text-[10px] font-black uppercase">{type} ({typeEntries.length})</span>
                                    </div>
                                    {typeEntries.map((entry) => (
                                        <Card key={entry.id} className="bg-[var(--card)] border border-[var(--border)]/50 p-4">
                                            {entry.image_url && (
                                                <div className="-mx-4 mb-3 overflow-hidden bg-[#0a0a0b] flex items-center justify-center" style={{ height: '160px' }}>
                                                    <img
                                                        src={entry.image_url}
                                                        alt={`Tag ${entry.day_number}`}
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col gap-1">
                                                    <Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[9px] font-bold uppercase">
                                                        {entry.title || `Tag ${entry.day_number}`}
                                                    </Badge>
                                                    <span className="text-[10px] text-[var(--muted-foreground)]">
                                                        {new Date(entry.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                {entry.day_number && (
                                                    <span className="text-[10px] text-[var(--muted-foreground)] font-bold">Tag {entry.day_number}</span>
                                                )}
                                            </div>
                                            {entry.notes && (
                                                <p className="text-xs text-[var(--muted-foreground)] italic leading-relaxed">{entry.notes}</p>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="text-center py-8 space-y-3">
                    <MessageSquare className="mx-auto text-[#484849]" size={32} />
                    <p className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-wider">
                        Kommentare sind in der Beta pausiert
                    </p>
                </div>
            </div>

            <BottomNav />
        </main>
    );
}
