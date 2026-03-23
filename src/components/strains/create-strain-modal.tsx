"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Leaf, AlertCircle } from "lucide-react";
import { StrainSource } from "@/lib/types";

interface CreateStrainModalProps {
    trigger?: React.ReactNode;
    onSuccess?: (strainId: string, slug: string) => void;
}

export function CreateStrainModal({ trigger, onSuccess }: CreateStrainModalProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [type, setType] = useState<"indica" | "sativa" | "hybrid">("hybrid");
    const [source, setSource] = useState<StrainSource>("street");
    const [thcEstimate, setThcEstimate] = useState("");
    const [cbdEstimate, setCbdEstimate] = useState("");
    const [description, setDescription] = useState("");
    const [leaflyUrl, setLeaflyUrl] = useState("");
    const [importing, setImporting] = useState(false);

    const handleLeaflyImport = async () => {
        if (!leaflyUrl || !leaflyUrl.includes("leafly.com")) {
            setError("Bitte gib eine gültige Leafly-URL ein.");
            return;
        }

        setImporting(true);
        setError(null);

        try {
            const response = await fetch("/api/import/leafly", {
                method: "POST",
                body: JSON.stringify({ url: leaflyUrl }),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) throw new Error("Import fehlgeschlagen");

            const data = await response.json();
            
            if (data.name) setName(data.name);
            if (data.type && ["indica", "sativa", "hybrid"].includes(data.type)) {
                setType(data.type as any);
            }
            if (data.thc) setThcEstimate(data.thc.toString());
            if (data.description) setDescription(data.description);
            
            // Note: We don't have fields for terpenes/effects in the current basic form,
            // but we could add them later if needed.
            
            setLeaflyUrl("");
        } catch (err) {
            setError("Daten konnten nicht von Leafly geladen werden.");
        } finally {
            setImporting(false);
        }
    };

    const resetForm = () => {
        setName("");
        setType("hybrid");
        setSource("street");
        setThcEstimate("");
        setCbdEstimate("");
        setDescription("");
        setLeaflyUrl("");
        setError(null);
    };

    const handleClose = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            resetForm();
        }
    };

    const generateSlug = (strainName: string): string => {
        return strainName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim()
            .substring(0, 50);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const slug = generateSlug(name);

            // Check if slug already exists
            const { data: existing } = await supabase
                .from("strains")
                .select("id")
                .eq("slug", slug)
                .single();

            if (existing) {
                setError("Eine Sorte mit diesem Namen existiert bereits.");
                setLoading(false);
                return;
            }

            // Create the custom strain
            const { data, error: insertError } = await supabase
                .from("strains")
                .insert({
                    name: name.trim(),
                    slug,
                    type,
                    source,
                    is_custom: true,
                    created_by: user.id,
                    thc_max: thcEstimate ? parseFloat(thcEstimate) : null,
                    cbd_max: cbdEstimate ? parseFloat(cbdEstimate) : null,
                    description: description.trim() || null,
                })
                .select("id, slug")
                .single();

            if (insertError) throw insertError;

            // Success!
            resetForm();
            setOpen(false);
            onSuccess?.(data.id, data.slug);
        } catch (err: any) {
            console.error("Error creating strain:", err);
            setError(err.message || "Fehler beim Erstellen der Sorte.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null; // Don't show for non-authenticated users
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-[#2FF801] hover:bg-[#2FF801]/90 text-black font-black rounded-2xl">
                        <Plus size={18} className="mr-2" />
                        Eigene Sorte erstellen
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-[#1a191b] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                        <Leaf className="text-[#2FF801]" size={24} />
                        Neue Sorte erstellen
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                    {/* Leafly Import */}
                    <div className="p-4 bg-[#2FF801]/5 border border-[#2FF801]/20 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="leaflyUrl" className="text-[10px] font-black uppercase tracking-widest text-[#2FF801]">
                                ✨ Von Leafly importieren
                            </Label>
                            {importing && <Loader2 className="animate-spin text-[#2FF801]" size={14} />}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="leaflyUrl"
                                value={leaflyUrl}
                                onChange={(e) => setLeaflyUrl(e.target.value)}
                                placeholder="https://www.leafly.com/strains/..."
                                className="bg-white/5 border-white/10 rounded-xl h-10 text-xs focus:border-[#2FF801]"
                            />
                            <Button
                                type="button"
                                onClick={handleLeaflyImport}
                                disabled={importing || !leaflyUrl}
                                className="bg-[#2FF801] hover:bg-[#2FF801]/90 text-black font-bold rounded-xl px-4 h-10 text-xs shrink-0"
                            >
                                Import
                            </Button>
                        </div>
                        <p className="text-[9px] text-white/40 italic">
                            Fügt Name, Typ, THC und Beschreibung automatisch ein.
                        </p>
                    </div>

                    <div className="h-px bg-white/5 w-full my-2" />

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Name der Sorte *
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="z.B. Meine Geheime OG"
                            className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801] focus:ring-[#2FF801]/20"
                            required
                            maxLength={100}
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Typ *
                        </Label>
                        <Select value={type} onValueChange={(v) => { if (v) setType(v as "indica" | "sativa" | "hybrid") }}>
                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a191b] border-white/10">
                                <SelectItem value="indica">Indica</SelectItem>
                                <SelectItem value="sativa">Sativa</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Source */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Herkunft *
                        </Label>
                        <Select value={source} onValueChange={(v) => { if (v) setSource(v as StrainSource) }}>
                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a191b] border-white/10">
                                <SelectItem value="pharmacy">🧪 Apotheke</SelectItem>
                                <SelectItem value="street">📦 Street</SelectItem>
                                <SelectItem value="grow">🌱 Eigenanbau</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[9px] text-white/30 italic">
                            Andere User sehen die Herkunft deiner Sorte.
                        </p>
                    </div>

                    {/* THC Estimate */}
                    <div className="space-y-2">
                        <Label htmlFor="thc" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            THC-Gehalt (Schätzung)
                        </Label>
                        <div className="relative">
                            <Input
                                id="thc"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={thcEstimate}
                                onChange={(e) => setThcEstimate(e.target.value)}
                                placeholder="z.B. 22.5"
                                className="bg-white/5 border-white/10 rounded-xl h-12 pr-8 focus:border-[#2FF801]"
                            />
                            <span className="absolute right-4 top-3.5 text-white/30 text-sm">%</span>
                        </div>
                    </div>

                    {/* CBD Estimate */}
                    <div className="space-y-2">
                        <Label htmlFor="cbd" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            CBD-Gehalt (Schätzung)
                        </Label>
                        <div className="relative">
                            <Input
                                id="cbd"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={cbdEstimate}
                                onChange={(e) => setCbdEstimate(e.target.value)}
                                placeholder="z.B. 1.2"
                                className="bg-white/5 border-white/10 rounded-xl h-12 pr-8 focus:border-[#2FF801]"
                            />
                            <span className="absolute right-4 top-3.5 text-white/30 text-sm">%</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Beschreibung / Notizen
                        </Label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optik, Geruch, Wirkung..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#2FF801] focus:ring-[#2FF801]/20 resize-none"
                            maxLength={500}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 rounded-xl p-3">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full bg-[#2FF801] hover:bg-[#2FF801]/90 text-black font-black rounded-xl h-14 text-sm uppercase tracking-widest"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Leaf size={18} className="mr-2" />
                                Sorte erstellen
                            </>
                        )}
                    </Button>

                    <p className="text-[9px] text-white/30 text-center leading-relaxed">
                        Deine Sorte wird öffentlich im Katalog angezeigt.<br />
                        Andere User können sie sehen und bewerten.
                    </p>
                </form>
            </DialogContent>
        </Dialog>
    );
}
