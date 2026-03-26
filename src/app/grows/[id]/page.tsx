"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Loader2, ChevronLeft, Sprout, Calendar, Edit2, Trash2,
    CheckCircle2, XCircle, Plus, Leaf, Droplets, Sun, Wind, Upload, Image as ImageIcon
} from "lucide-react";
import Link from "next/link";

interface Grow {
    id: string;
    title: string;
    grow_type: string;
    medium?: string;
    light_type?: string;
    nutrients?: string;
    start_date?: string;
    harvest_date?: string;
    yield_grams?: number;
    status: string;
    is_public: boolean;
    strains?: {
        id: string;
        name: string;
        slug: string;
    };
}

interface GrowEntry {
    id: string;
    grow_id: string;
    user_id: string;
    day_number?: number;
    title?: string;
    notes?: string;
    image_url?: string;
    height_cm?: number;
    temperature?: number;
    humidity?: number;
    ph_value?: number;
    created_at: string;
}

export default function GrowDetailPage() {
    const { id } = useParams();
    const { user, isDemoMode } = useAuth();
    const router = useRouter();

    const [grow, setGrow] = useState<Grow | null>(null);
    const [entries, setEntries] = useState<GrowEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Edit form state
    const [editTitle, setEditTitle] = useState("");
    const [editStatus, setEditStatus] = useState("active");

    // New entry state
    const [newEntryTitle, setNewEntryTitle] = useState("");
    const [newEntryNotes, setNewEntryNotes] = useState("");
    const [newEntryDayNumber, setNewEntryDayNumber] = useState<number>(1);

    useEffect(() => {
        async function fetchGrow() {
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
                        strains: { id: "1", name: "Gorilla Glue #4", slug: "gorilla-glue" }
                    });
                    setEntries([]);
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
                        setEditStatus(growData.status);
                    }

                    // Fetch entries
                    const { data: entriesData } = await supabase
                        .from("grow_entries")
                        .select("*")
                        .eq("grow_id", id)
                        .order("created_at", { ascending: false });

                    if (entriesData) setEntries(entriesData);
                }
            } catch (err) {
                console.error("Error fetching grow:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchGrow();
    }, [id, user, isDemoMode]);

    const handleUpdateGrow = async () => {
        if (!grow || !user) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from("grows")
                .update({ title: editTitle, status: editStatus })
                .eq("id", grow.id);

            if (error) throw error;
            setGrow({ ...grow, title: editTitle, status: editStatus });
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            console.error("Error updating grow:", err);
            alert("Fehler beim Aktualisieren");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddEntry = async () => {
        if (!grow || !user) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from("grow_entries")
                .insert({
                    grow_id: grow.id,
                    user_id: user.id,
                    day_number: newEntryDayNumber,
                    title: newEntryTitle,
                    notes: newEntryNotes,
                    image_url: previewImage
                });

            if (error) throw error;

            // Refresh entries
            const { data } = await supabase
                .from("grow_entries")
                .select("*")
                .eq("grow_id", grow.id)
                .order("created_at", { ascending: false });

            if (data) setEntries(data);
            setIsAddingEntry(false);
            setNewEntryNotes("");
            setNewEntryTitle("");
            setPreviewImage(null);
        } catch (err) {
            console.error("Error adding entry:", err);
            alert("Fehler beim Hinzufügen");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !grow || !user) return;
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${grow.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('grows').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('grows').getPublicUrl(fileName);
            setPreviewImage(publicUrl);
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload fehlgeschlagen");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteGrow = async () => {
        if (!grow || !user) return;
        if (!confirm("Dieses Grow wirklich löschen?")) return;

        try {
            const { error } = await supabase.from("grows").delete().eq("id", grow.id);
            if (error) throw error;
            router.push("/grows");
        } catch (err) {
            console.error("Error deleting grow:", err);
            alert("Fehler beim Löschen");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
            </div>
        );
    }

    if (!grow) {
        return (
            <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center gap-4">
                <XCircle className="text-red-500" size={48} />
                <p className="font-bold uppercase tracking-wider">Grow nicht gefunden</p>
                <Link href="/grows">
                    <Button className="bg-[#00F5FF] text-black">Zurück zu Grows</Button>
                </Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white text-black pb-32">
            <header className="p-6 sticky top-0 bg-white/90 backdrop-blur-xl z-50 border-b border-black/10">
                <div className="flex items-center gap-4">
                    <Link href="/grows">
                        <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/5 rounded-full">
                            <ChevronLeft size={24} />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Grow Details</span>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">{grow.title}</h1>
                    </div>
                    {!isEditing && (
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsEditing(true)}
                                variant="ghost" size="icon" className="text-black/60 hover:text-[#00F5FF] rounded-full"
                            >
                                <Edit2 size={18} />
                            </Button>
                            <Button
                                onClick={handleDeleteGrow}
                                variant="ghost" size="icon" className="text-black/60 hover:text-red-500 rounded-full"
                            >
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <div className="p-6 space-y-6">
                {/* Status Card */}
                <Card className="bg-[#1a191b] border-black/10 p-5">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-black/40 font-black uppercase tracking-wider">Titel</label>
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="bg-black/5 border-black/10 text-black"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-black/40 font-black uppercase tracking-wider">Status</label>
                                <div className="flex gap-2">
                                    {['active', 'completed', 'abandoned'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setEditStatus(s)}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${editStatus === s
                                                ? s === 'active' ? 'bg-[#2FF801] text-black' : s === 'completed' ? 'bg-[#00F5FF] text-black' : 'bg-red-500 text-black'
                                                : 'bg-black/5 text-black/40'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleUpdateGrow} disabled={isSaving} className="flex-1 bg-[#00F5FF] text-black font-black">
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Speichern"}
                                </Button>
                                <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-black/60">Abbrechen</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Badge className={grow.status === 'active' ? 'bg-[#2FF801] text-black border-none' : grow.status === 'completed' ? 'bg-[#00F5FF] text-black border-none' : 'bg-red-500 text-black border-none'}>
                                    {grow.status.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="border-black/10 text-black/40 text-[10px]">
                                    {grow.grow_type.toUpperCase()}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {grow.strains && (
                                    <Link href={`/strains/${grow.strains.slug}`} className="flex items-center gap-2 p-3 bg-black/5 rounded-xl">
                                        <Leaf size={16} className="text-[#2FF801]" />
                                        <span className="text-xs font-bold">{grow.strains.name}</span>
                                    </Link>
                                )}
                                {grow.start_date && (
                                    <div className="flex items-center gap-2 p-3 bg-black/5 rounded-xl">
                                        <Calendar size={16} className="text-[#00F5FF]" />
                                        <span className="text-xs font-bold">{grow.start_date}</span>
                                    </div>
                                )}
                            </div>

                            {grow.medium && (
                                <div className="flex items-center gap-2 text-black/60 text-xs">
                                    <Droplets size={14} /> Medium: {grow.medium}
                                </div>
                            )}
                            {grow.light_type && (
                                <div className="flex items-center gap-2 text-black/60 text-xs">
                                    <Sun size={14} /> Licht: {grow.light_type}
                                </div>
                            )}
                            {grow.yield_grams && (
                                <div className="flex items-center gap-2 text-black/60 text-xs">
                                    <CheckCircle2 size={14} className="text-[#2FF801]" /> Ertrag: {grow.yield_grams}g
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* Entries Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase tracking-wider text-black/60">Grow Tagebuch</h2>
                        <Button
                            onClick={() => setIsAddingEntry(true)}
                            size="sm"
                            className="bg-[#2FF801] text-black font-black text-[10px]"
                        >
                            <Plus size={14} className="mr-1" /> Eintrag
                        </Button>
                    </div>

                    {isAddingEntry && (
                        <Card className="bg-[#1a191b] border-black/10 p-5 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-black/40 font-black uppercase tracking-wider">Titel</label>
                                <Input
                                    value={newEntryTitle}
                                    onChange={(e) => setNewEntryTitle(e.target.value)}
                                    placeholder="z.B. Tag 5 - Keimling"
                                    className="bg-black/5 border-black/10 text-black"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-black/40 font-black uppercase tracking-wider">Tag Nummer</label>
                                <Input
                                    type="number"
                                    value={newEntryDayNumber}
                                    onChange={(e) => setNewEntryDayNumber(parseInt(e.target.value) || 1)}
                                    className="bg-black/5 border-black/10 text-black"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-black/40 font-black uppercase tracking-wider">Foto</label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-20 h-20 rounded-xl border border-black/10 bg-black/5 flex items-center justify-center text-black/40 hover:bg-black/10 transition-all overflow-hidden"
                                    >
                                        {isUploading ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : previewImage ? (
                                            <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <Upload size={20} />
                                        )}
                                    </button>
                                    {previewImage && (
                                        <button
                                            onClick={() => setPreviewImage(null)}
                                            className="text-red-500 text-[10px] font-bold uppercase"
                                        >
                                            Entfernen
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-black/40 font-black uppercase tracking-wider">Notizen</label>
                                <textarea
                                    value={newEntryNotes}
                                    onChange={(e) => setNewEntryNotes(e.target.value)}
                                    placeholder="Wie entwickelt sich die Pflanze?"
                                    className="w-full bg-black/5 border border-black/10 rounded-xl py-3 px-4 text-xs text-black placeholder:text-black/20 focus:outline-none focus:border-[#00F5FF]/50"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleAddEntry} disabled={isSaving} className="flex-1 bg-[#00F5FF] text-black font-black">
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Speichern"}
                                </Button>
                                <Button onClick={() => { setIsAddingEntry(false); setPreviewImage(null); }} variant="ghost" className="text-black/60">Abbrechen</Button>
                            </div>
                        </Card>
                    )}

                    {entries.length > 0 ? (
                        <div className="space-y-3">
                            {entries.map((entry) => (
                                <Card key={entry.id} className="bg-[#1a191b] border-black/10 p-4">
                                    {entry.image_url && (
                                        <div className="-mx-4 mb-3 overflow-hidden bg-[#0a0a0b] flex items-center justify-center" style={{ height: '200px' }}>
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
                                            <span className="text-[10px] text-black/40">
                                                {new Date(entry.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-black/40 font-bold">Tag {entry.day_number}</span>
                                    </div>
                                    {entry.notes && (
                                        <p className="text-xs text-black/70 italic leading-relaxed">{entry.notes}</p>
                                    )}
                                    {entry.height_cm && (
                                        <div className="flex items-center gap-1 mt-2 text-[10px] text-black/40">
                                            <Wind size={12} /> {entry.height_cm}cm
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        !isAddingEntry && (
                            <div className="text-center py-8 space-y-3">
                                <Sprout className="mx-auto text-black/20" size={32} />
                                <p className="text-black/40 text-xs font-bold uppercase tracking-wider">Noch keine Einträge</p>
                                <p className="text-black/20 text-[10px]">Dokumentiere deinen Grow mit dem Tagebuch</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            <BottomNav />
        </main>
    );
}
