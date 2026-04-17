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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Globe, Wand2, Check, Loader2 } from "lucide-react";
import { Strain, StrainSource } from "@/lib/types";
import { safeParsePercent } from "@/lib/strain-display";
import { useEffect } from "react";
import { writeOrganizationActivity } from "@/lib/organization-activities";

type NamedItem = string | { name?: string | null };

type SlugRow = { slug: string };
type OptionalSchemaColumn = "source" | "avg_thc" | "avg_cbd" | "is_custom";

type StrainPayload = {
    name: string;
    farmer: string;
    type: "indica" | "sativa" | "hybrid";
    source?: StrainSource;
    thc_max: number | null;
    avg_thc?: number | null;
    cbd_max: number | null;
    avg_cbd?: number | null;
    description: string | null;
    terpenes?: string[] | null;
    flavors?: string[] | null;
    effects: string[] | null;
    image_url: string | null;
    slug?: string;
    created_by?: string;
    is_custom?: boolean;
    organization_id?: string;
};

const OPTIONAL_SCHEMA_COLUMNS = new Set<OptionalSchemaColumn>([
    "source",
    "avg_thc",
    "avg_cbd",
    "is_custom",
]);

function createBaseSlug(value: string) {
    const baseSlug = value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return baseSlug || `strain-${Date.now()}`;
}

function getMissingStrainsColumn(err: unknown) {
    if (!err || typeof err !== "object") {
        return null;
    }

    const errorRecord = err as Record<string, unknown>;
    const rawMessage = [errorRecord.message, errorRecord.details, errorRecord.hint]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" ");

    const match = rawMessage.match(/could not find the ['"]([^'"]+)['"] column of ['"]strains['"] in the schema cache/i);
    return match?.[1] ?? null;
}

function removeUnsupportedColumn(payload: StrainPayload, column: OptionalSchemaColumn) {
    const nextPayload = { ...payload };
    delete nextPayload[column];
    return nextPayload;
}

function getSubmissionErrorMessage(err: unknown) {
    if (err instanceof Error && err.message.trim()) {
        return err.message;
    }

    if (err && typeof err === "object") {
        const errorRecord = err as Record<string, unknown>;
        const message = [errorRecord.message, errorRecord.details, errorRecord.hint]
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .join(" | ");

        const code = typeof errorRecord.code === "string" ? errorRecord.code : "";
        const normalizedMessage = `${message} ${code}`.toLowerCase();

        if (code === "23505" || normalizedMessage.includes("duplicate key")) {
            return "Es existiert bereits eine Sorte mit diesem Slug. Bitte ändere den Namen leicht oder bearbeite den vorhandenen Eintrag.";
        }

        if (normalizedMessage.includes("row-level security")) {
            return "Speichern fehlgeschlagen: Für diesen Datensatz fehlen Berechtigungen in Supabase (RLS).";
        }

        const missingColumn = getMissingStrainsColumn(err);

        if (missingColumn === "farmer") {
            return "Speichern fehlgeschlagen: Die Datenbank kennt das Feld Farmer noch nicht. Bitte führe die aktuelle Supabase-Migration aus.";
        }

        if (missingColumn) {
            return `Speichern fehlgeschlagen: Die Datenbank kennt das Feld "${missingColumn}" in der Tabelle strains noch nicht.`;
        }

        if (message) {
            return message;
        }
    }

    return "Fehler beim Speichern.";
}

interface StrainFormModalProps {
    strain?: Strain; // Optional: If provided, we are in EDIT mode
    onSuccess?: (id: string, slug: string, source: StrainSource, usedSourceFallback: boolean) => void;
    trigger: React.ReactNode;
    organizationId?: string; // Optional org context for community strains
}

export function CreateStrainModal({ strain, onSuccess, trigger, organizationId }: StrainFormModalProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditMode = !!strain;

    // Form State
    const [name, setName] = useState("");
    const [farmer, setFarmer] = useState("");
    const [type, setType] = useState<"indica" | "sativa" | "hybrid">("hybrid");
    const [source, setSource] = useState<StrainSource>("street");
    const [thcEstimate, setThcEstimate] = useState("");
    const [cbdEstimate, setCbdEstimate] = useState("");
    const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>([]);
    const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [leaflyUrl, setLeaflyUrl] = useState("");
    const [importedImageUrl, setImportedImageUrl] = useState<string | null>(null);

    // Effect to populate fields in edit mode
    useEffect(() => {
        if (strain && open) {
            setName(strain.name || "");
            setFarmer(strain.farmer || "");
            setType(strain.type === "sativa" || strain.type === "indica" || strain.type === "hybrid" ? strain.type : "hybrid");
            setSource(strain.source || "street");
            setThcEstimate(strain.avg_thc?.toString() || strain.thc_max?.toString() || "");
            setCbdEstimate(strain.avg_cbd?.toString() || strain.cbd_max?.toString() || "");

            // Extract display names for flavors, terpenes and effects
            const extractNames = (items: NamedItem[]) => items
                .map((item) => typeof item === 'string' ? item : item.name)
                .filter((value): value is string => Boolean(value));
            setSelectedTerpenes(
                Array.isArray(strain.flavors)
                    ? extractNames(strain.flavors as NamedItem[])
                    : Array.isArray(strain.terpenes)
                        ? extractNames(strain.terpenes as NamedItem[])
                        : []
            );
            setSelectedEffects(Array.isArray(strain.effects) ? extractNames(strain.effects as NamedItem[]) : []);

            setDescription(strain.description || "");
            setImportedImageUrl(strain.image_url || null);
        }
    }, [strain, open]);

    useEffect(() => {
        if (!open || !isEditMode || !strain?.id || importedImageUrl) {
            return;
        }

        let cancelled = false;

        const loadUserImage = async () => {
            const { data, error: collectionError } = await supabase
                .from("user_collection")
                .select("user_image_url")
                .eq("strain_id", strain.id)
                .eq("user_id", user?.id ?? "")
                .maybeSingle();

            if (cancelled || collectionError) {
                return;
            }

            if (data?.user_image_url) {
                setImportedImageUrl(data.user_image_url);
            }
        };

        void loadUserImage();

        return () => {
            cancelled = true;
        };
    }, [open, isEditMode, strain?.id, strain?.image_url, importedImageUrl, user?.id]);

    // Erweiterte Optionen
    const TASTE_OPTIONS = [
        "Erdig", "Süß", "Zitrone", "Kiefer", "Beeren", "Würzig", "Fruchtig", "Diesel",
        "Skunk", "Minze", "Kaffee", "Nussig", "Vanille", "Blumig", "Käse", "Grapefruit",
        "Tropisch", "Honig", "Chemisch", "Menthol"
    ];

    const EFFECT_OPTIONS = [
        "Entspannt", "Kreativ", "Glücklich", "Fokussiert", "Euphörisch", "Schläfrig",
        "Energisch", "Gesprächig", "Hungrig", "Kichernd", "Beruhigend", "Prickelnd",
        "Motiviert", "Klar"
    ];

    const toggleItem = (item: string, list: string[], setList: (items: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const resetForm = () => {
        setName("");
        setFarmer("");
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

    const generateUniqueSlug = async (strainName: string, userId: string) => {
        const fallbackBaseSlug = createBaseSlug(strainName);

        const { data: generatedSlug, error: slugRpcError } = await supabase.rpc("generate_custom_strain_slug", {
            name: strainName,
            user_id: userId,
        });

        if (!slugRpcError && typeof generatedSlug === "string" && generatedSlug.trim()) {
            return generatedSlug.trim();
        }

        const { data: existingSlugs, error: slugQueryError } = await supabase
            .from("strains")
            .select("slug")
            .ilike("slug", `${fallbackBaseSlug}%`);

        if (slugQueryError) {
            throw slugQueryError;
        }

        const takenSlugs = new Set((existingSlugs as SlugRow[] | null)?.map((item) => item.slug) ?? []);

        if (!takenSlugs.has(fallbackBaseSlug)) {
            return fallbackBaseSlug;
        }

        let counter = 1;
        let candidate = `${fallbackBaseSlug}-${counter}`;

        while (takenSlugs.has(candidate)) {
            counter += 1;
            candidate = `${fallbackBaseSlug}-${counter}`;
        }

        return candidate;
    };

    const saveStrain = async (payload: StrainPayload) => {
        let payloadToSave = { ...payload };

        while (true) {
            const response = isEditMode && strain
                ? await supabase
                    .from("strains")
                    .update(payloadToSave)
                    .eq("id", strain.id)
                    .select()
                    .maybeSingle()
                : await supabase
                    .from("strains")
                    .insert([payloadToSave])
                    .select()
                    .maybeSingle();

            if (!response.error) {
                if (!response.data) {
                    throw new Error(isEditMode ? "Sorte konnte nicht aktualisiert werden. (Eventuell keine Berechtigung?)" : "Sorte konnte nicht erstellt werden.");
                }

                return response.data;
            }

            const missingColumn = getMissingStrainsColumn(response.error);

            if (
                missingColumn &&
                OPTIONAL_SCHEMA_COLUMNS.has(missingColumn as OptionalSchemaColumn) &&
                missingColumn in payloadToSave
            ) {
                payloadToSave = removeUnsupportedColumn(payloadToSave, missingColumn as OptionalSchemaColumn);
                continue;
            }

            throw response.error;
        }
    };

    const handleImportFromLeafly = async () => {
        try {
            const parsedUrl = new URL(leaflyUrl.trim());
            const isValidLeaflyHost = parsedUrl.hostname === "leafly.com" || parsedUrl.hostname === "www.leafly.com";
            const isValidStrainPath = parsedUrl.pathname.startsWith("/strains/");

            if (!isValidLeaflyHost || !isValidStrainPath) {
                setError("Bitte gib eine gültige Leafly-URL ein.");
                return;
            }
        } catch {
            setError("Bitte gib eine gültige Leafly-URL ein.");
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            const response = await fetch("/api/import/leafly", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: leaflyUrl.trim() }),
            });

            if (!response.ok) throw new Error("Import fehlgeschlagen");

            const data = await response.json();

            if (data.name) setName(data.name);
            if (data.type) setType(data.type === "hybrid" || data.type === "sativa" || data.type === "indica" ? data.type : "hybrid");

            if (data.thc !== undefined && data.thc !== null) setThcEstimate(String(data.thc));
            if (data.cbd !== undefined && data.cbd !== null) setCbdEstimate(String(data.cbd));

            if (data.description) setDescription(data.description.replace(/<[^>]*>/g, '').slice(0, 500));
            if (typeof data.image_url === "string" && data.image_url.trim()) setImportedImageUrl(data.image_url);

            // Extensive Mapping Dictionary
            const TASTE_MAP: Record<string, string[]> = {
                "Erdig": ["earthy", "wood", "pine", "soil", "musty"],
                "Süß": ["sweet", "candy", "sugar", "vanilla", "honey", "caramel"],
                "Zitrone": ["citrus", "lemon", "lime", "orange", "grapefruit", "zest", "sour"],
                "Kiefer": ["pine", "pinene", "forest", "wood"],
                "Beeren": ["berry", "blueberry", "grape", "strawberry", "cherry", "raspberry"],
                "Würzig": ["spicy", "pepper", "clove", "herbal", "mint", "sage"],
                "Fruchtig": ["fruity", "tropical", "mango", "pineapple", "apple", "peach", "pear"],
                "Diesel": ["diesel", "gas", "chemical", "skunk", "pungent", "fuel"],
                "Skunk": ["skunk", "pungent"],
                "Minze": ["mint", "menthol", "peppermint"],
                "Kaffee": ["coffee", "roasted", "dark"],
                "Nussig": ["nutty", "chestnut", "almond"],
                "Vanille": ["vanilla", "cream"],
                "Blumig": ["flowery", "floral", "lavender", "rose", "violet"],
                "Käse": ["cheese", "blue cheese", "pungent"],
                "Grapefruit": ["grapefruit", "citrus"],
                "Tropisch": ["tropical", "pineapple", "mango", "exotic"],
                "Honig": ["honey", "syrup"],
                "Chemisch": ["chemical", "ammonia", "bleach"],
                "Menthol": ["menthol", "cooling"]
            };

            const EFFECT_MAP: Record<string, string[]> = {
                "Entspannt": ["relaxed", "calm", "couch-lock", "soothing", "body high"],
                "Kreativ": ["creative", "inspired", "artistic", "abstract"],
                "Glücklich": ["happy", "cheerful", "content"],
                "Fokussiert": ["focused", "clear-headed", "attentive", "productive"],
                "Euphörisch": ["euphoric", "uplifted", "blissful", "exhilarated"],
                "Schläfrig": ["sleepy", "tired", "insomnia", "sedated", "drowsy"],
                "Energisch": ["energetic", "active", "aroused", "motivated"],
                "Gesprächig": ["talkative", "social", "chatty"],
                "Hungrig": ["hungry", "munchies", "appetite"],
                "Kichernd": ["giggly", "laughing"],
                "Beruhigend": ["calming", "soothing", "anxiety", "relief"],
                "Prickelnd": ["tingly", "body-buzz"],
                "Motiviert": ["motivated", "productive"],
                "Klar": ["clear", "mental clarity"]
            };

            const importedTasteValues = Array.isArray(data.flavors)
                ? data.flavors
                : Array.isArray(data.terpenes)
                    ? data.terpenes
                    : [];

            if (importedTasteValues.length > 0) {
                const foundTastes = TASTE_OPTIONS.filter(opt => {
                    const keywords = TASTE_MAP[opt] || [];
                    const normalizedImported = importedTasteValues.map((t: string) => t.toLowerCase());
                    return normalizedImported.some((t: string) =>
                        t.includes(opt.toLowerCase()) ||
                        keywords.some(k => t.includes(k))
                    );
                });
                setSelectedTerpenes(foundTastes);
            }

            if (Array.isArray(data.effects)) {
                const foundEffects = EFFECT_OPTIONS.filter(opt => {
                    const keywords = EFFECT_MAP[opt] || [];
                    const normalizedImported = data.effects.map((e: string) => e.toLowerCase());
                    return normalizedImported.some((e: string) =>
                        e.includes(opt.toLowerCase()) ||
                        keywords.some(k => e.includes(k))
                    );
                });
                setSelectedEffects(foundEffects);
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
        if (!farmer.trim()) {
            setError("Bitte gib einen Farmer ein.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const parsedThcEstimate = safeParsePercent(thcEstimate);
            const parsedCbdEstimate = safeParsePercent(cbdEstimate);

            if (thcEstimate.trim() && parsedThcEstimate === null) {
                setError("Bitte gib einen gültigen THC-Wert ein.");
                return;
            }

            if (cbdEstimate.trim() && parsedCbdEstimate === null) {
                setError("Bitte gib einen gültigen CBD-Wert ein.");
                return;
            }

            const slug = isEditMode && strain ? strain.slug : await generateUniqueSlug(name.trim(), user.id);

            const basePayload: StrainPayload = {
                name: name.trim(),
                farmer: farmer.trim(),
                type,
                source,
                thc_max: parsedThcEstimate,
                avg_thc: parsedThcEstimate,
                cbd_max: parsedCbdEstimate,
                avg_cbd: parsedCbdEstimate,
                description: description.trim() || null,
                flavors: selectedTerpenes.length > 0 ? selectedTerpenes : null,
                effects: selectedEffects.length > 0 ? selectedEffects : null,
                image_url: importedImageUrl || (isEditMode ? strain.image_url ?? null : null)
            };

            if (!isEditMode) {
                basePayload.slug = slug;
                basePayload.created_by = user.id;
                basePayload.is_custom = true;
                if (organizationId) {
                    basePayload.organization_id = organizationId;
                }
            }

            const resultData = await saveStrain(basePayload);

            if (organizationId) {
                // Write to organization_activities for the activities page
                await writeOrganizationActivity({
                    supabase,
                    organizationId,
                    userId: user.id,
                    eventType: "strain_added",
                    targetType: "strain",
                    target: { id: resultData.id, name: resultData.name },
                    metadata: { type: resultData.type, thc_max: resultData.thc_max },
                });
            }

            // Save source & metadata to user_collection (upsert by composite unique key)
            const collectionPayload = {
                user_id: user.id,
                strain_id: resultData.id,
                batch_info: source,
                user_thc_percent: parsedThcEstimate,
                user_cbd_percent: parsedCbdEstimate,
                user_notes: description.trim() || null,
                user_image_url: importedImageUrl || (isEditMode ? strain.image_url ?? null : null)
            };

            // Try insert first, if unique constraint violation, update instead
            const { error: insertError } = await supabase.from("user_collection").insert(collectionPayload);
            if (insertError) {
                if (insertError.code === '23505') {
                    // Unique constraint violation - row exists, update it
                    const { error: updateError } = await supabase
                        .from("user_collection")
                        .update({
                            batch_info: source,
                            user_thc_percent: parsedThcEstimate,
                            user_cbd_percent: parsedCbdEstimate,
                            user_notes: description.trim() || null,
                            user_image_url: importedImageUrl || (isEditMode ? strain.image_url ?? null : null),
                            updated_at: new Date().toISOString(),
                        })
                        .eq("user_id", user.id)
                        .eq("strain_id", resultData.id);
                    if (updateError) throw updateError;
                } else {
                    throw insertError;
                }
            }

            if (!isEditMode) resetForm();
            setOpen(false);
            onSuccess?.(resultData.id, resultData.slug, source, false);

        } catch (err: unknown) {
            console.error("Submission error:", err);
            setError(getSubmissionErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && !isEditMode) resetForm(); }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-md bg-[var(--card)] border-white/10 text-[var(--foreground)] rounded-[2.5rem] p-8 overflow-y-auto max-h-[90vh] no-scrollbar">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-[#00F5FF]">
                        {isEditMode ? "Sorte bearbeiten" : "Neue Sorte"}
                    </DialogTitle>
                    <DialogDescription className="text-[var(--foreground)]/40 text-xs font-bold uppercase tracking-widest">
                        {isEditMode ? "Passe die Details deiner Entdeckung an" : "Eigene Entdeckung im Katalog verewigen"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Leafly Quick Import - Only show in CREATE mode */}
                    {!isEditMode && (
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
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">Name *</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Super Silver Haze" className="bg-white/5 border-white/10 rounded-xl h-12 text-lg font-bold focus:border-[#2FF801]" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="farmer" className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">Farmer *</Label>
                            <Input id="farmer" value={farmer} onChange={(e) => setFarmer(e.target.value)} placeholder="z.B. Green Valley Farm" className="bg-white/5 border-white/10 rounded-xl h-12 text-base font-semibold focus:border-[#2FF801]" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">THC (%)</Label>
                                <Input type="number" step="0.1" value={thcEstimate} onChange={(e) => setThcEstimate(e.target.value)} placeholder="z.B. 22.5" className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">CBD (%)</Label>
                                <Input type="number" step="0.1" value={cbdEstimate} onChange={(e) => setCbdEstimate(e.target.value)} placeholder="z.B. 1.0" className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">Typ *</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['indica', 'sativa', 'hybrid'] as const).map((t) => (
                                <button key={t} type="button" onClick={() => setType(t)} className={`py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${type === t ? "bg-[#2FF801] border-[#2FF801] text-black shadow-[0_0_15px_#2FF80144]" : "bg-white/5 border-white/10 text-[var(--foreground)]/40"}`}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">Herkunft *</Label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'pharmacy', label: '🧪 Apotheke' },
                                { id: 'street', label: '📦 Street' },
                                { id: 'grow', label: '🌱 Eigenanbau' },
                                { id: 'csc', label: '🏢 CSC' },
                                { id: 'other', label: 'Sonstiges' }
                            ].map((s) => (
                                <button key={s.id} type="button" onClick={() => setSource(s.id as StrainSource)} className={`py-3 px-3 flex-1 min-w-[30%] rounded-xl text-[10px] font-bold uppercase border transition-all ${source === s.id ? "bg-[#2FF801] border-[#2FF801] text-black" : "bg-white/5 border-white/10 text-[var(--foreground)]/40"}`}>{s.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">Geschmack</Label>
                        <div className="flex flex-wrap gap-2">
                            {TASTE_OPTIONS.map((t) => (
                                <button key={t} type="button" onClick={() => toggleItem(t, selectedTerpenes, setSelectedTerpenes)} className={`py-2 px-3 rounded-full text-[10px] font-bold border transition-all ${selectedTerpenes.includes(t) ? "bg-[#00F5FF] border-[#00F5FF] text-black" : "bg-white/5 border-white/10 text-[var(--foreground)]/40"}`}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">Wirkung</Label>
                        <div className="flex flex-wrap gap-2">
                            {EFFECT_OPTIONS.map((e) => (
                                <button key={e} type="button" onClick={() => toggleItem(e, selectedEffects, setSelectedEffects)} className={`py-2 px-3 rounded-full text-[10px] font-bold border transition-all ${selectedEffects.includes(e) ? "bg-[#2FF801] border-[#2FF801] text-black" : "bg-white/5 border-white/10 text-[var(--foreground)]/40"}`}>{e}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/60">Beschreibung</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Beschreibe Wirkung, Geschmack oder besondere Eigenschaften..."
                            className="min-h-[120px] bg-white/5 border-white/10 rounded-2xl text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/30 focus:border-[#2FF801]"
                        />
                    </div>

                    {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-widest">{error}</div>}

                    <Button type="submit" disabled={isLoading} className="w-full h-16 bg-white text-black hover:bg-[#2FF801] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            isEditMode ? <><Check className="mr-2" /> Änderungen speichern</> : <><Plus className="mr-2" /> Strain erstellen</>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
