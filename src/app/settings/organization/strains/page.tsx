"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronLeft, Loader2, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StrainType = "indica" | "sativa" | "hybrid" | "ruderalis";

function generateSlug(name: string): string {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
}

export default function OrgStrainsPage() {
  const { user, activeOrganization, session } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<StrainType>("hybrid");
  const [thcMin, setThcMin] = useState("");
  const [thcMax, setThcMax] = useState("");
  const [cbdMin, setCbdMin] = useState("");
  const [cbdMax, setCbdMax] = useState("");
  const [effects, setEffects] = useState("");
  const [flavors, setFlavors] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin =
    activeOrganization?.role === "owner" || activeOrganization?.role === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeOrganization || !session?.access_token) return;

    if (!name.trim()) {
      setError("Bitte gib einen Namen ein.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const slug = generateSlug(name.trim());

      const effectsArray = effects
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const flavorsArray = flavors
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        slug,
        type,
        thc_min: thcMin ? parseFloat(thcMin) : null,
        thc_max: thcMax ? parseFloat(thcMax) : null,
        cbd_min: cbdMin ? parseFloat(cbdMin) : null,
        cbd_max: cbdMax ? parseFloat(cbdMax) : null,
        effects: effectsArray.length > 0 ? effectsArray : null,
        flavors: flavorsArray.length > 0 ? flavorsArray : null,
        description: description.trim() || null,
        is_custom: true,
        source: "grow" as const,
        created_by: user.id,
        organization_id: activeOrganization.organization_id,
        organization_type: activeOrganization.organizations?.organization_type,
      };

      const res = await fetch("/api/strains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Erstellen der Sorte");
      }

      router.push("/strains?tab=org");
    } catch (err: unknown) {
      console.error("Error creating strain:", err);
      setError(
        err instanceof Error ? err.message : "Fehler beim Erstellen der Sorte"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Not logged in or no organization
  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[#355E3B] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </main>
    );
  }

  // Admin guard
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#355E3B] text-white pb-32">
        <header className="p-8 pb-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
              {activeOrganization.organizations?.name}
            </p>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
              Organisation
            </h1>
          </div>
        </header>

        <div className="px-8 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight mb-2">
            Kein Zugriff
          </h2>
          <p className="text-white/40 text-sm font-medium max-w-[280px]">
            Nur Owner und Admins können Sorten für die Organisation erstellen.
          </p>
        </div>

        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            Neue Sorte
          </h1>
        </div>
      </header>

      <div className="px-8 mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Outdoor Green"
                className="bg-white/5 border-white/10 rounded-xl h-12 text-base font-semibold focus:border-[#2FF801]"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Typ *
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {(["indica", "sativa", "hybrid", "ruderalis"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${
                      type === t
                        ? "bg-[#2FF801] border-[#2FF801] text-black shadow-[0_0_15px_#2FF80144]"
                        : "bg-white/5 border-white/10 text-white/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thcMin" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  THC Min (%)
                </Label>
                <Input
                  id="thcMin"
                  type="number"
                  step="0.1"
                  value={thcMin}
                  onChange={(e) => setThcMin(e.target.value)}
                  placeholder="z.B. 15"
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thcMax" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  THC Max (%)
                </Label>
                <Input
                  id="thcMax"
                  type="number"
                  step="0.1"
                  value={thcMax}
                  onChange={(e) => setThcMax(e.target.value)}
                  placeholder="z.B. 22"
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cbdMin" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  CBD Min (%)
                </Label>
                <Input
                  id="cbdMin"
                  type="number"
                  step="0.1"
                  value={cbdMin}
                  onChange={(e) => setCbdMin(e.target.value)}
                  placeholder="z.B. 0.5"
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cbdMax" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  CBD Max (%)
                </Label>
                <Input
                  id="cbdMax"
                  type="number"
                  step="0.1"
                  value={cbdMax}
                  onChange={(e) => setCbdMax(e.target.value)}
                  placeholder="z.B. 2"
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effects" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Wirkungen
              </Label>
              <Input
                id="effects"
                value={effects}
                onChange={(e) => setEffects(e.target.value)}
                placeholder="z.B. Entspannt, Kreativ, Glücklich (kommagetrennt)"
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flavors" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Geschmack
              </Label>
              <Input
                id="flavors"
                value={flavors}
                onChange={(e) => setFlavors(e.target.value)}
                placeholder="z.B. Süß, Erdbeeren, Zitrone (kommagetrennt)"
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-[#2FF801]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Beschreibung
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe Wirkung, Geschmack oder besondere Eigenschaften..."
                className="min-h-[120px] bg-white/5 border-white/10 rounded-2xl text-sm text-white placeholder:text-white/30 focus:border-[#2FF801]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-white text-black hover:bg-[#2FF801] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Plus className="mr-2" size={18} />
                Sorte erstellen
              </>
            )}
          </Button>
        </form>
      </div>

      <BottomNav />
    </main>
  );
}
