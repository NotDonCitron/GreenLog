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
    onSuccess?: (strainId: string, slug: string, source: StrainSource, usedSourceFallback?: boolean) => void;
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
    const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>([]);
    const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
    const [description, setDescription] = useState("");

    const TASTE_OPTIONS = ["Erdig", "Süß", "Zitrone", "Kiefer", "Beeren", "Würzig", "Fruchtig", "Diesel"];
    const EFFECT_OPTIONS = ["Entspannt", "Kreativ", "Hungrig", "Fokussiert", "Euphörisch", "Schläfrig", "Energisch"];

    const toggleItem = (item: string, list: string[], setList: (items: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };
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
            console.debug("[CreateStrainModal] Leafly import started", { leaflyUrl });
            const response = await fetch("/api/import/leafly", {
                method: "POST",
                body: JSON.stringify({ url: leaflyUrl }),
                headers: { "Content-Type": "application/json" },
            });

            const responseText = await response.text();
            console.debug("[CreateStrainModal] Leafly import response", {
                ok: response.ok,
                status: response.status,
                bodyPreview: responseText.slice(0, 400),
            });

            if (!response.ok) {
                throw new Error("Import fehlgeschlagen");
            }

            const data = JSON.parse(responseText);
            console.debug("[CreateStrainModal] Leafly import parsed payload", data);

            if (typeof data.name === "string" && data.name.trim()) setName(data.name.trim());
            if (data.type && ["indica", "sativa", "hybrid"].includes(String(data.type).toLowerCase())) {
                setType(String(data.type).toLowerCase() as any);
            }
            if (data.thc !== undefined && data.thc !== null && data.thc !== "") {
                setThcEstimate(String(data.thc));
            }
            if (data.cbd !== undefined && data.cbd !== null && data.cbd !== "") {
                setCbdEstimate(String(data.cbd));
            }
            if (typeof data.description === "string" && data.description.trim()) {
                setDescription(data.description.trim());
            }
            if (data.source && ["pharmacy", "street", "grow"].includes(String(data.source))) {
                setSource(data.source as StrainSource);
            }

            // Note: We don't have dedicated form fields for terpenes/effects yet.
            // The import still seeds the core strain metadata that can be saved.

            setLeaflyUrl("");
        } catch (err) {
            console.error("[CreateStrainModal] Leafly import failed", err);
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
        setSelectedTerpenes([]);
        setSelectedEffects([]);
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
            };
            let payload: Record<string, unknown> = {
                ...basePayload,
                source,
                is_custom: true,
            };

            console.debug("[CreateStrainModal] Submit payload", payload);

            // Check if slug already exists
            const { data: existing, error: existingError } = await supabase
                .from("strains")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();

            if (existingError) {
                console.warn("[CreateStrainModal] Slug precheck warning", existingError);
            }

            if (existing) {
                setError("Eine Sorte mit diesem Namen existiert bereits.");
                setLoading(false);
                return;
            }

            let usedSourceFallback = false;
            let insertResult = await supabase
                .from("strains")
                .insert(payload)
                .select("id, slug")
                .single();

            while (insertResult.error) {
                const errorCode = String(insertResult.error.code || "").toUpperCase();
                const errorMessage = [
                    insertResult.error.message,
                    insertResult.error.details,
                    insertResult.error.hint,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const isSchemaFallbackError = ["PGRST204", "42703", "23502", "23514"].includes(errorCode)
                    || errorMessage.includes("column")
                    || errorMessage.includes("schema cache")
                    || errorMessage.includes("could not find")
                    || errorMessage.includes("does not exist")
                    || errorMessage.includes("unknown")
                    || errorMessage.includes("invalid input");

                if (!isSchemaFallbackError) {
                    break;
                }

                let retried = false;

                if (errorMessage.includes("source") && "source" in payload) {
                    console.warn("[CreateStrainModal] Retrying insert without source", insertResult.error);
                    const { source: _source, ...nextPayload } = payload;
                    payload = nextPayload;
                    usedSourceFallback = true;
                    retried = true;
                }

                if (errorMessage.includes("is_custom") && "is_custom" in payload) {
                    console.warn("[CreateStrainModal] Retrying insert without is_custom", insertResult.error);
                    const { is_custom: _isCustom, ...nextPayload } = payload;
                    payload = nextPayload;
                    retried = true;
                }

                if (!retried) {
                    break;
                }

                insertResult = await supabase
                    .from("strains")
                    .insert(payload)
                    .select("id, slug")
                    .single();
            }

            const { data, error: insertError } = insertResult;

            console.debug("[CreateStrainModal] Insert result", {
                data,
                insertError,
                payload,
                usedSourceFallback,
            });

            if (insertError) throw insertError;

            // 4. Save source to user_collection (Persistence)
            const { error: collectionError } = await supabase
                .from("user_collection")
                .upsert({
                    user_id: user.id,
                    strain_id: data.id,
                    batch_info: source, // 'pharmacy', 'street', or 'grow'
                    user_thc_percent: thcEstimate ? parseFloat(thcEstimate) : null,
                    user_cbd_percent: cbdEstimate ? parseFloat(cbdEstimate) : null,
                    user_notes: description.trim() || null,
                }, { onConflict: 'user_id,strain_id' });

            if (collectionError) {
                console.warn("[CreateStrainModal] Failed to save to user_collection", collectionError);
            }

            // Success!
            resetForm();
            setOpen(false);
            onSuccess?.(data.id, data.slug, source, usedSourceFallback);
        } catch (err: any) {
            console.error("Error creating strain:", err);
            setError(err?.message || "Fehler beim Erstellen der Sorte.");
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
                    <DialogDescription className="text-[11px] text-white/50">
                        Erstelle eine eigene Sorte oder importiere Grunddaten per Leafly-Link.
                    </DialogDescription>
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

                    {/* Type Selection */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Typ *
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['indica', 'sativa', 'hybrid'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                        type === t 
                                        ? "bg-[#2FF801] border-[#2FF801] text-black shadow-[0_0_15px_rgba(47,248,1,0.3)]" 
                                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Source Selection */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Herkunft *
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'pharmacy', label: '🧪 Apotheke' },
                                { id: 'street', label: '📦 Street' },
                                { id: 'grow', label: '🌱 Eigen' },
                                { id: 'csc', label: '🏢 CSC' },
                                { id: 'other', label: 'Sonstiges' }
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSource(s.id as StrainSource)}
                                    className={`py-3 px-3 flex-1 min-w-[30%] rounded-xl text-[10px] font-bold uppercase tracking-tight border transition-all ${
                                        source === s.id 
                                        ? "bg-[#2FF801] border-[#2FF801] text-black shadow-[0_0_15px_rgba(47,248,1,0.3)]" 
                                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
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

                    {/* Geschmäcker (Terpenes) Selection */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Geschmack
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {TASTE_OPTIONS.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleItem(t, selectedTerpenes, setSelectedTerpenes)}
                                    className={`py-2 px-3 rounded-full text-[10px] font-bold border transition-all ${
                                        selectedTerpenes.includes(t)
                                        ? "bg-[#00F5FF] border-[#00F5FF] text-black shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Wirkungen (Effects) Selection */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Wirkung
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {EFFECT_OPTIONS.map((e) => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => toggleItem(e, selectedEffects, setSelectedEffects)}
                                    className={`py-2 px-3 rounded-full text-[10px] font-bold border transition-all ${
                                        selectedEffects.includes(e)
                                        ? "bg-[#2FF801] border-[#2FF801] text-black shadow-[0_0_15px_rgba(47,248,1,0.3)]"
                                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                    }`}
                                >
                                    {e}
                                </button>
                            ))}
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
