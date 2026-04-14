"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Loader2, ChevronLeft, Sprout, Calendar, Edit2, Trash2,
    CheckCircle2, XCircle, Plus, Leaf, Droplets, Sun, Wind, Upload,
    Eye, EyeOff, Users, MessageSquare, Clock, Droplet, Camera
} from "lucide-react";
import Link from "next/link";
import { checkAndUnlockBadges } from "@/lib/badges";
import { PhaseBadge, LogEntryModal, PlantLimitWarning } from "@/components/grows";
import type { Grow, Plant, GrowEntry, GrowMilestone, GrowComment, PlantStatus } from "@/lib/types";

// Status color mapping: active = bright, harvested/destroyed = muted
const STATUS_COLORS: Record<PlantStatus, { active: string; muted: string }> = {
    seedling: { active: 'bg-green-500/20 text-green-400 border-green-500/30', muted: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]' },
    vegetative: { active: 'bg-blue-500/20 text-blue-400 border-blue-500/30', muted: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]' },
    flowering: { active: 'bg-purple-500/20 text-purple-400 border-purple-500/30', muted: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]' },
    flushing: { active: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', muted: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]' },
    harvested: { active: 'bg-orange-500/20 text-orange-400 border-orange-500/30', muted: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]' },
    destroyed: { active: 'bg-red-500/20 text-red-400 border-red-500/30', muted: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]' },
};

const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];

const NEXT_STATUS: Partial<Record<PlantStatus, PlantStatus>> = {
    seedling: 'vegetative',
    vegetative: 'flowering',
    flowering: 'flushing',
    flushing: 'harvested',
};

// Entry type icons
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

export default function GrowDetailPage() {
    const { id } = useParams();
    const { user, isDemoMode } = useAuth();
    const router = useRouter();
    const { error: toastError, success: toastSuccess } = useToast();

    const [grow, setGrow] = useState<Grow | null>(null);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [entries, setEntries] = useState<GrowEntry[]>([]);
    const [milestones, setMilestones] = useState<GrowMilestone[]>([]);
    const [comments, setComments] = useState<GrowComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [addingEntryPlantId, setAddingEntryPlantId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showPlantLimitWarning, setShowPlantLimitWarning] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Edit form state
    const [editTitle, setEditTitle] = useState("");
    const [editIsPublic, setEditIsPublic] = useState(true);

    // New plant state
    const [newPlantName, setNewPlantName] = useState("");
    const [isAddingPlant, setIsAddingPlant] = useState(false);

    // Modal state
    const [logEntryModalOpen, setLogEntryModalOpen] = useState(false);
    const [logEntryPlantId, setLogEntryPlantId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchGrowData() {
            if (!id) return;
            setLoading(true);

            try {
                if (isDemoMode) {
                    setGrow({
                        id: id as string,
                        title: "Demo Grow",
                        grow_type: "indoor",
                        status: "active",
                        is_public: true,
                        start_date: new Date().toISOString().split('T')[0],
                        strains: { name: "Gorilla Glue #4" }
                    });
                    setPlants([]);
                    setEntries([]);
                    setMilestones([]);
                    setComments([]);
                } else if (user) {
                    const { data: growData, error: growError } = await supabase
                        .from("grows")
                        .select("*, strains(id, name, slug)")
                        .eq("id", id)
                        .single();

                    if (growError) throw growError;
                    if (growData) {
                        setGrow(growData);
                        setEditTitle(growData.title);
                        setEditIsPublic(growData.is_public);
                    }

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

                    // Fetch comments
                    const { data: commentsData } = await supabase
                        .from("grow_comments")
                        .select("*, profiles(id, username, display_name, avatar_url)")
                        .eq("grow_id", id)
                        .order("created_at", { ascending: true });
                    if (commentsData) setComments(commentsData);

                    // Check if user is following
                    const { data: followData } = await supabase
                        .from("grow_follows")
                        .select("id")
                        .eq("grow_id", id)
                        .eq("user_id", user.id)
                        .single();
                    setIsFollowing(!!followData);

                    // Fetch follower count
                    const { count } = await supabase
                        .from("grow_follows")
                        .select("*", { count: 'exact', head: true })
                        .eq("grow_id", id);
                    setFollowerCount(count || 0);
                }
            } catch (err) {
                console.error("Error fetching grow:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchGrowData();
    }, [id, user, isDemoMode]);

    const handleUpdateGrow = async () => {
        if (!grow || !user) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from("grows")
                .update({ title: editTitle, is_public: editIsPublic })
                .eq("id", grow.id);

            if (error) throw error;
            setGrow({ ...grow, title: editTitle, is_public: editIsPublic });
            setIsEditing(false);
        } catch (err) {
            console.error("Error updating grow:", err);
            toastError("Fehler beim Aktualisieren");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPlant = async () => {
        if (!grow || !user || !newPlantName.trim()) return;

        // Check plant limit (max 3 active plants per KCanG)
        const activePlants = plants.filter(p => ACTIVE_STATUSES.includes(p.status));
        if (activePlants.length >= 3) {
            setShowPlantLimitWarning(true);
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("plants")
                .insert({
                    grow_id: grow.id,
                    user_id: user.id,
                    plant_name: newPlantName.trim(),
                    strain_id: grow.strain_id || null,
                    status: 'seedling',
                    planted_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Refetch plants
            const { data: plantsData } = await supabase
                .from("plants")
                .select("*")
                .eq("grow_id", id)
                .order("created_at", { ascending: true });
            if (plantsData) setPlants(plantsData);

            setNewPlantName("");
            setIsAddingPlant(false);
            await checkAndUnlockBadges(user.id, supabase);
        } catch (err) {
            console.error("Error adding plant:", err);
            toastError("Fehler beim Hinzufügen der Pflanze");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePlantStatus = async (plantId: string, newStatus: PlantStatus) => {
        if (!user) return;
        setIsSaving(true);

        try {
            const updates: Record<string, unknown> = { status: newStatus };
            if (newStatus === 'harvested') {
                updates.harvested_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from("plants")
                .update(updates)
                .eq("id", plantId);

            if (error) throw error;

            // Update local state
            setPlants(plants.map(p =>
                p.id === plantId ? { ...p, status: newStatus, harvested_at: newStatus === 'harvested' ? new Date().toISOString() : null } : p
            ));

            await checkAndUnlockBadges(user.id, supabase);
        } catch (err) {
            console.error("Error updating plant status:", err);
            toastError("Fehler beim Aktualisieren");
        } finally {
            setIsSaving(false);
        }
    };

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
            toastError("Fehler beim Folgen");
        }
    };

    const handleSubmitComment = async () => {
        if (!user || !grow || !newComment.trim()) return;
        setIsSubmittingComment(true);

        try {
            const { data, error } = await supabase
                .from("grow_comments")
                .insert({
                    grow_id: grow.id,
                    user_id: user.id,
                    comment: newComment.trim(),
                })
                .select("*, profiles(id, username, display_name, avatar_url)")
                .single();

            if (error) throw error;
            setComments([...comments, data]);
            setNewComment("");
        } catch (err) {
            console.error("Error submitting comment:", err);
            toastError("Fehler beim Kommentieren");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const openLogEntryModal = (plantId: string | null = null) => {
        setLogEntryPlantId(plantId);
        setLogEntryModalOpen(true);
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
                <XCircle className="text-[#ff716c]" size={48} />
                <p className="font-bold uppercase tracking-wider">Grow nicht gefunden</p>
                <Link href="/grows">
                    <Button className="bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black font-black">Zurück zu Grows</Button>
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
                    <Link href="/grows">
                        <Button variant="ghost" size="icon" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-full transition-all">
                            <ChevronLeft size={24} />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Grow Details</span>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">{grow.title}</h1>
                    </div>
                    {isOwner && !isEditing && (
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsEditing(true)}
                                variant="ghost" size="icon" className="text-[var(--muted-foreground)] hover:text-[#00F5FF] rounded-full transition-all"
                            >
                                <Edit2 size={18} />
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            {/* Plant Limit Warning */}
            {showPlantLimitWarning && (
                <div className="p-4">
                    <PlantLimitWarning
                        visible={showPlantLimitWarning}
                        onDismiss={() => setShowPlantLimitWarning(false)}
                    />
                </div>
            )}

            <div className="p-6 space-y-6 relative z-10">
                {/* Status Card */}
                <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-wider">Titel</label>
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)]"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-wider">Öffentlich sichtbar</label>
                                <Switch
                                    checked={editIsPublic}
                                    onCheckedChange={(checked) => setEditIsPublic(checked)}
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleUpdateGrow} disabled={isSaving} className="flex-1 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black font-black">
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Speichern"}
                                </Button>
                                <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-[var(--muted-foreground)]">Abbrechen</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Badge className={grow.status === 'active' ? 'bg-[#2FF801] text-black border-none' : grow.status === 'completed' ? 'bg-[#00F5FF] text-black border-none' : 'bg-[#ff716c] text-black border-none'}>
                                    {grow.status.toUpperCase()}
                                </Badge>
                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    {grow.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
                                    <span className="text-[10px] font-bold uppercase">{grow.is_public ? 'Öffentlich' : 'Privat'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {grow.strains && (
                                    <Link href={`/strains/${grow.strains.slug}`} className="flex items-center gap-2 p-3 bg-[var(--muted)] border border-[var(--border)]/50 rounded-xl hover:border-[#00F5FF]/50 transition-all">
                                        <Leaf size={16} className="text-[#2FF801]" />
                                        <span className="text-xs font-bold text-[var(--foreground)]">{grow.strains.name}</span>
                                    </Link>
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
                        </div>
                    )}
                </Card>

                {/* Follow Section (for public grows or explore view) */}
                {grow.is_public && !isOwner && (
                    <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                <Users size={16} />
                                <span className="text-xs font-bold">{followerCount} Follower</span>
                            </div>
                            <Button
                                onClick={handleFollowGrow}
                                size="sm"
                                className={isFollowing ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'bg-[#2FF801] text-black font-black'}
                            >
                                {isFollowing ? 'Folge ich' : 'Folgen'}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Compliance Disclaimer for public grows */}
                {grow.is_public && (
                    <Card className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <div className="flex items-start gap-2">
                            <Eye size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-300 font-medium leading-relaxed">
                                Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG).
                            </p>
                        </div>
                    </Card>
                )}

                {/* Plants Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">Pflanzen</h2>
                        {isOwner && plants.filter(p => ACTIVE_STATUSES.includes(p.status)).length < 3 && (
                            <Button
                                onClick={() => setIsAddingPlant(true)}
                                size="sm"
                                className="bg-gradient-to-r from-[#2FF801] to-[#2fe000] text-black font-black text-[10px]"
                            >
                                <Plus size={14} className="mr-1" /> Pflanze
                            </Button>
                        )}
                    </div>

                    {/* Add Plant Form */}
                    {isAddingPlant && (
                        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-4 space-y-3">
                            <Input
                                value={newPlantName}
                                onChange={(e) => setNewPlantName(e.target.value)}
                                placeholder="Pflanzenname (z.B. Plant 1)"
                                className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)]"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleAddPlant} disabled={isSaving || !newPlantName.trim()} size="sm" className="flex-1 bg-[#2FF801] text-black font-black">
                                    {isSaving ? <Loader2 className="animate-spin" size={14} /> : 'Hinzufügen'}
                                </Button>
                                <Button onClick={() => { setIsAddingPlant(false); setNewPlantName(""); }} variant="ghost" size="sm" className="text-[var(--muted-foreground)]">Abbrechen</Button>
                            </div>
                        </Card>
                    )}

                    {plants.length > 0 ? (
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
                                            {isOwner && isActive && NEXT_STATUS[plant.status] && (
                                                <Button
                                                    onClick={() => handleUpdatePlantStatus(plant.id, NEXT_STATUS[plant.status]!)}
                                                    disabled={isSaving}
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-[10px] border-[var(--border)]/50"
                                                >
                                                    <span className="hidden sm:inline">Weiter </span>{NEXT_STATUS[plant.status]}
                                                </Button>
                                            )}
                                        </div>
                                        {isOwner && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]/50">
                                                <Button
                                                    onClick={() => openLogEntryModal(plant.id)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-[10px] text-[#00F5FF]"
                                                >
                                                    <Plus size={12} className="mr-1" /> Eintrag
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    ) : !isAddingPlant && (
                        <div className="text-center py-8 space-y-3">
                            <Sprout className="mx-auto text-[#484849]" size={32} />
                            <p className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-wider">Noch keine Pflanzen</p>
                        </div>
                    )}
                </div>

                {/* Global Log Entry Button */}
                {isOwner && plants.length > 0 && (
                    <Button
                        onClick={() => openLogEntryModal(null)}
                        className="w-full bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black font-black"
                    >
                        <Plus size={16} className="mr-2" /> Neuer Eintrag
                    </Button>
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

                {/* Grow Entries by Type */}
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
                                            {entry.height_cm && (
                                                <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--muted-foreground)]">
                                                    <Wind size={12} /> {entry.height_cm}cm
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Comments Section */}
                <div className="space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">
                        Kommentare ({comments.length})
                    </h2>

                    {user && (
                        <div className="flex gap-2">
                            <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Kommentar schreiben..."
                                className="flex-1 bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)]"
                            />
                            <Button
                                onClick={handleSubmitComment}
                                disabled={isSubmittingComment || !newComment.trim()}
                                size="sm"
                                className="bg-[#2FF801] text-black font-black"
                            >
                                {isSubmittingComment ? <Loader2 className="animate-spin" size={14} /> : 'Senden'}
                            </Button>
                        </div>
                    )}

                    {comments.length > 0 ? (
                        <div className="space-y-3">
                            {comments.map((comment) => (
                                <Card key={comment.id} className="bg-[var(--card)] border border-[var(--border)]/50 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center overflow-hidden">
                                            {comment.profiles?.avatar_url ? (
                                                <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-[#00F5FF]">
                                                    {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-[var(--foreground)]">
                                                {comment.profiles?.display_name || comment.profiles?.username}
                                            </span>
                                            <span className="text-[10px] text-[var(--muted-foreground)] ml-2">
                                                {new Date(comment.created_at).toLocaleDateString('de-DE')}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed pl-10">{comment.comment}</p>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 space-y-3">
                            <MessageSquare className="mx-auto text-[#484849]" size={32} />
                            <p className="text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-wider">Noch keine Kommentare</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Log Entry Modal */}
            {logEntryModalOpen && (
                <LogEntryModal
                    open={logEntryModalOpen}
                    onClose={() => setLogEntryModalOpen(false)}
                    growId={grow.id}
                    plantId={logEntryPlantId}
                    onEntryAdded={() => {
                        // Refetch entries
                        supabase
                            .from("grow_entries")
                            .select("*")
                            .eq("grow_id", id)
                            .order("created_at", { ascending: false })
                            .then(({ data }) => data && setEntries(data));
                    }}
                />
            )}

            <BottomNav />
        </main>
    );
}
