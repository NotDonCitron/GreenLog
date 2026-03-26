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
    activeOrganization?.role === "gründer" || activeOrganization?.role === "admin";

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

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
        {/* Ambient glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
        </div>

        <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
          >
            <ChevronLeft size={20} className="text-[var(--foreground)]" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
              {activeOrganization.organizations?.name}
            </p>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
              Organisation
            </h1>
          </div>
        </header>

        <div className="px-6 py-12 flex flex-col items-center justify-center text-center relative z-10">
          <div className="w-16 h-16 rounded-full bg-[#ff716c]/10 border border-[#ff716c]/20 flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-[#ff716c]" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)] font-display mb-2">
            Kein Zugriff
          </h2>
          <p className="text-[var(--muted-foreground)] text-sm font-medium max-w-[280px]">
            Nur Owner und Admins können Sorten für die Organisation erstellen.
          </p>
        </div>

        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
        >
          <ChevronLeft size={20} className="text-[var(--foreground)]" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
            Neue Sorte
          </h1>
        </div>
      </header>

      <div className="px-6 mt-4 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-[#ff716c]/10 border border-[#ff716c]/20 rounded-2xl text-[#ff716c] text-xs font-bold uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Outdoor Green"
                className="bg-[var(--input)] border border-[var(--border)]/50 rounded-xl h-12 text-base font-semibold text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
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
                        : "bg-[var(--card)] border-[var(--border)]/50 text-[var(--muted-foreground)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thcMin" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                  THC Min (%)
                </Label>
                <Input
                  id="thcMin"
                  type="number"
                  step="0.1"
                  value={thcMin}
                  onChange={(e) => setThcMin(e.target.value)}
                  placeholder="z.B. 15"
                  className="bg-[var(--input)] border border-[var(--border)]/50 rounded-xl h-12 text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thcMax" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                  THC Max (%)
                </Label>
                <Input
                  id="thcMax"
                  type="number"
                  step="0.1"
                  value={thcMax}
                  onChange={(e) => setThcMax(e.target.value)}
                  placeholder="z.B. 22"
                  className="bg-[var(--input)] border border-[var(--border)]/50 rounded-xl h-12 text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cbdMin" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                  CBD Min (%)
                </Label>
                <Input
                  id="cbdMin"
                  type="number"
                  step="0.1"
                  value={cbdMin}
                  onChange={(e) => setCbdMin(e.target.value)}
                  placeholder="z.B. 0.5"
                  className="bg-[var(--input)] border border-[var(--border)]/50 rounded-xl h-12 text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cbdMax" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                  CBD Max (%)
                </Label>
                <Input
                  id="cbdMax"
                  type="number"
                  step="0.1"
                  value={cbdMax}
                  onChange={(e) => setCbdMax(e.target.value)}
                  placeholder="z.B. 2"
                  className="bg-[var(--input)] border border-[var(--border)]/50 rounded-xl h-12 text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effects" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                Wirkungen
              </Label>
              <Input
                id="effects"
                value={effects}
                onChange={(e) => setEffects(e.target.value)}
                placeholder="z.B. Entspannt, Kreativ, Glücklich (kommagetrennt)"
                className="bg-[var(--input)] border border-[var(--border)]/50 rounded-xl h-12 text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flavors" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                Geschmack
              </Label>
              <Input
                id="flavors"
                value={flavors}
                onChange={(e) => setFlavors(e.target.value)}
                placeholder="z.B. Süß, Erdbeeren, Zitrone (kommagetrennt)"
                className="bg-[var(--input)] border border-[var(--border)]/50 rounded-xl h-12 text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                Beschreibung
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe Wirkung, Geschmack oder besondere Eigenschaften..."
                className="min-h-[120px] bg-[var(--input)] border border-[var(--border)]/50 rounded-2xl text-sm text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#2FF801]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] hover:opacity-90 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-[#00F5FF]/20"
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
