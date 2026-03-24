"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Globe, Wand2, Check } from "lucide-react";
import { StrainSource } from "@/lib/types";

interface CreateStrainModalProps {
    onSuccess?: (id: string, slug: string, source: StrainSource, usedSourceFallback: boolean) => void;
    trigger: React.ReactNode;
}

export function CreateStrainModal({ onSuccess, trigger }: CreateStrainModalProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [type, setType] = useState<"indica" | "sativa" | "hybrid">("hybrid");
    const [source, setSource] = useState<StrainSource>("street");
    const [thcEstimate, setThcEstimate] = useState("");
    const [cbdEstimate, setCbdEstimate] = useState("");
    const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>([]);
    const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [leaflyUrl, setLeaflyUrl] = useState("");
    const [importedImageUrl, setImportedImageUrl] = useState<string | null>(null);

    const TASTE_OPTIONS = ["Erdig", "Süß", "Zitrone", "Kiefer", "Beeren", "Würzig", "Fruchtig", "Diesel"];
    const EFFECT_OPTIONS = ["Entspannt", "Kreativ", "Hungrig", "Fokussiert", "Euphörisch", "Schläfrig", "Energisch"];

    const toggleItem = (item: string, list: string[], setList: (items: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const resetForm = () => {
        setName("");
        setType("hybrid");
        setSource("street");
        setThcEstimate("");
        setCbdEstimate("");
        setSelectedTerpenes([]);
        setSelectedEffects([]);
        setDescription("");
        setLeaflyUrl("");
        setImportedImageUrl(null);
        setError(null);
    };

    const handleImportFromLeafly = async () => {
        if (!leaflyUrl.includes("leafly.com/strains/")) {
            setError("Bitte gib eine gültige Leafly-URL ein.");
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            const response = await fetch("/api/import/leafly", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: leaflyUrl }),
            });

            if (!response.ok) throw new Error("Import fehlgeschlagen");

            const data = await response.json();

            if (data.name) setName(data.name);
            if (data.type) setType(data.type === "hybrid" || data.type === "sativa" || data.type === "indica" ? data.type : "hybrid");
            if (data.thc) setThcEstimate(data.thc.toString());
            if (data.cbd) setCbdEstimate(data.cbd.toString());
            if (data.description) setDescription(data.description.slice(0, 500));
            if (data.image_url) setImportedImageUrl(data.image_url);
            
            // Map terpenes & effects to our options
            if (Array.isArray(data.terpenes)) {
                const found = TASTE_OPTIONS.filter(opt => 
                    data.terpenes.some((t: string) => t.toLowerCase().includes(opt.toLowerCase()))
                );
                setSelectedTerpenes(found);
            }
            if (Array.isArray(data.effects)) {
                const found = EFFECT_OPTIONS.filter(opt => 
                    data.effects.some((e: string) => e.toLowerCase().includes(opt.toLowerCase()))
                );
                setSelectedEffects(found);
            }

        } catch (err) {
            console.error("Import error:", err);
            setError("Konnte Daten nicht von Leafly laden.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!name.trim()) {
            setError("Bitte gib einen Namen ein.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            const basePayload = {
                name: name.trim(),
                slug,
                type,
                created_by: user.id,
                thc_max: thcEstimate ? parseFloat(thcEstimate) : null,
                cbd_max: cbdEstimate ? parseFloat(cbdEstimate) : null,
                description: description.trim() || null,
                terpenes: selectedTerpenes.length > 0 ? selectedTerpenes : null,
                effects: selectedEffects.length > 0 ? selectedEffects : null,
                image_url: importedImageUrl || null
            };

            const { data, error: insertError } = await supabase
                .from("strains")
                .insert([basePayload])
                .select()
                .single();

            if (insertError) throw insertError;

            // Save source & metadata to user_collection
            await supabase.from("user_collection").upsert({
                user_id: user.id,
                strain_id: data.id,
                batch_info: source,
                user_thc_percent: thcEstimate ? parseFloat(thcEstimate) : null,
                user_notes: description.trim() || null,
                user_image_url: importedImageUrl || null
            }, { onConflict: 'user_id,strain_id' });

            resetForm();
            setOpen(false);
            onSuccess?.(data.id, data.slug, source, false);

        } catch (err: any) {
            console.error("Creation error:", err);
            setError(err.message || "Fehler beim Erstellen.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <div onClick={() => setOpen(true)}>{trigger}</div>
            <DialogContent className="max-w-md bg-[#1a191b] border-white/10 text-white rounded-[2.5rem] p-8 overflow-y-auto max-h-[90vh] no-scrollbar">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-[#00F5FF]">Neue Sorte</DialogTitle>
                    <DialogDescription className="text-white/40 text-xs font-bold uppercase tracking-widest">
                        Eigene Entdeckung im Katalog verewigen
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Leafly Quick Import */}
                    <div className="space-y-3 bg-[#00F5FF]/5 p-4 rounded-3xl border border-[#00F5FF]/20">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#00F5FF] flex items-center gap-2">
                            <Globe size={12} /> Leafly Quick Import
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={leaflyUrl}
                                onChange={(e) => setLeaflyUrl(e.target.value)}
                                placeholder="https://www.leafly.com/strains/..."
                                className="bg-black/20 border-white/10 rounded-xl text-xs h-10 flex-1 focus:border-[#00F5FF]"
                            />
                            <Button 
                                type="button" 
                                onClick={handleImportFromLeafly}
                                disabled={isImporting || !leaflyUrl}
                                className="h-10 px-4 bg-[#00F5FF] text-black font-black uppercase text-[10px] rounded-xl hover:bg-[#00F5FF]/80 transition-all"
                            >
                                {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-white/60">Name *</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Super Silver Haze" className="bg-white/5 border-white/10 rounded-xl h-12 text-lg font-bold focus:border-[#2FF801]" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">THC (%)</Label>
                                <Input type="number" step="0.1" value={thcEstimate} onChange={(e) => setThcEstimate(e.target.value)} placeholder="z.B. 22.5" className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">CBD (%)</Label>
                                <Input type="number" step="0.1" value={cbdEstimate} onChange={(e) => setCbdEstimate(e.target.value)} placeholder="z.B. 1.0" className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Typ *</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['indica', 'sativa', 'hybrid'] as const).map((t) => (
                                <button key={t} type="button" onClick={() => setType(t)} className={`py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${type === t ? "bg-[#2FF801] border-[#2FF801] text-black shadow-[0_0_15px_#2FF80144]" : "bg-white/5 border-white/10 text-white/40"}`}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Herkunft *</Label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'pharmacy', label: '🧪 Apotheke' },
                                { id: 'street', label: '📦 Street' },
                                { id: 'grow', label: '🌱 Eigen' },
                                { id: 'csc', label: '🏢 CSC' },
                                { id: 'other', label: 'Sonstiges' }
                            ].map((s) => (
                                <button key={s.id} type="button" onClick={() => setSource(s.id as StrainSource)} className={`py-3 px-3 flex-1 min-w-[30%] rounded-xl text-[10px] font-bold uppercase border transition-all ${source === s.id ? "bg-[#2FF801] border-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/40"}`}>{s.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Geschmack</Label>
                        <div className="flex flex-wrap gap-2">
                            {TASTE_OPTIONS.map((t) => (
                                <button key={t} type="button" onClick={() => toggleItem(t, selectedTerpenes, setSelectedTerpenes)} className={`py-2 px-3 rounded-full text-[10px] font-bold border transition-all ${selectedTerpenes.includes(t) ? "bg-[#00F5FF] border-[#00F5FF] text-black" : "bg-white/5 border-white/10 text-white/40"}`}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Wirkung</Label>
                        <div className="flex flex-wrap gap-2">
                            {EFFECT_OPTIONS.map((e) => (
                                <button key={e} type="button" onClick={() => toggleItem(e, selectedEffects, setSelectedEffects)} className={`py-2 px-3 rounded-full text-[10px] font-bold border transition-all ${selectedEffects.includes(e) ? "bg-[#2FF801] border-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/40"}`}>{e}</button>
                            ))}
                        </div>
                    </div>

                    {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-widest">{error}</div>}

                    <Button type="submit" disabled={isLoading} className="w-full h-16 bg-white text-black hover:bg-[#2FF801] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        {isLoading ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2" /> Strain erstellen</>}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
