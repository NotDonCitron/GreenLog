"use client";

import { useState } from "react";

type Theme = "minimalist" | "modern" | "earthy";

const themes: { id: Theme; name: string; description: string }[] = [
  { id: "minimalist", name: "Minimalist Premium", description: "Medical & Clean - Apotheken-Feeling" },
  { id: "modern", name: "Modern & Energetic", description: "Lifestyle / Pop - Lebendig & Modern" },
  { id: "earthy", name: "Earthy & Organic", description: "Craft Grower - Natur & Handwerk" },
];

const strains = [
  { name: "Super Lemon Haze", type: "Sativa", thc: "25%", cbd: "0.1%" },
  { name: "Purple Kush", type: "Indica", thc: "22%", cbd: "0.3%" },
  { name: "Gorilla Glue #4", type: "Hybrid", thc: "26%", cbd: "0.1%" },
  { name: "Jack Herer", type: "Sativa", thc: "24%", cbd: "0.1%" },
  { name: "Northern Lights", type: "Indica", thc: "18%", cbd: "0.1%" },
];

const typeColors: Record<string, string> = {
  Sativa: "bg-green-500",
  Indica: "bg-purple-500",
  Hybrid: "bg-blue-500",
};

export default function ColorPreviewPage() {
  const [activeTheme, setActiveTheme] = useState<Theme>("minimalist");
  const [activeTab, setActiveTab] = useState<"cards" | "buttons" | "badges">("cards");

  return (
    <div className={`theme-preview min-h-screen ${activeTheme === "minimalist" ? "theme-minimalist" : activeTheme === "modern" ? "theme-modern" : "theme-earthy"}`}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold title-font text-foreground">CannaLog Color Preview</h1>
          <div className="flex gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setActiveTheme(theme.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTheme === theme.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Theme Description */}
      <div className="bg-primary/10 border-b">
        <div className="container mx-auto px-4 py-3">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold">{themes.find((t) => t.id === activeTheme)?.name}</span> —{" "}
            {themes.find((t) => t.id === activeTheme)?.description}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {(["cards", "buttons", "badges"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Color Palette */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Farbpalette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <ColorSwatch name="Background" variable="--background" />
            <ColorSwatch name="Foreground" variable="--foreground" />
            <ColorSwatch name="Primary" variable="--primary" />
            <ColorSwatch name="Secondary" variable="--secondary" />
            <ColorSwatch name="Accent" variable="--accent" />
            <ColorSwatch name="Muted" variable="--muted" />
            <ColorSwatch name="Border" variable="--border" />
            <ColorSwatch name="Card" variable="--card" />
            <ColorSwatch name="Destructive" variable="--destructive" />
            <ColorSwatch name="Chart 1" variable="--chart-1" />
            <ColorSwatch name="Chart 2" variable="--chart-2" />
            <ColorSwatch name="Chart 3" variable="--chart-3" />
          </div>
        </section>

        {/* Cards */}
        {activeTab === "cards" && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Strain Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strains.map((strain, i) => (
                <div key={i} className="premium-card rounded-2xl overflow-hidden">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-4xl opacity-30">🌿</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-card-foreground">{strain.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${typeColors[strain.type]}`}>
                          {strain.type}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{strain.thc} THC</span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>CBD: {strain.cbd}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Buttons */}
        {activeTab === "buttons" && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Buttons</h2>
            <div className="bg-card rounded-2xl p-8 space-y-6">
              <div className="flex flex-wrap gap-4 items-center">
                <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Primary Button
                </button>
                <button className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Secondary Button
                </button>
                <button className="px-6 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Accent Button
                </button>
                <button className="px-6 py-2.5 bg-destructive text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Destructive
                </button>
                <button className="px-6 py-2.5 bg-background text-foreground border border-border rounded-lg font-medium hover:bg-secondary transition-colors">
                  Outline
                </button>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <button className="px-6 py-2.5 bg-primary/80 text-primary-foreground rounded-lg font-medium hover:opacity-80 transition-opacity" disabled>
                  Disabled
                </button>
                <button className="px-4 py-2 text-primary underline-offset-4 hover:underline">
                  Link Primary
                </button>
                <button className="px-4 py-2 text-accent underline-offset-4 hover:underline">
                  Link Accent
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Badges */}
        {activeTab === "badges" && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Badges & Tags</h2>
            <div className="bg-card rounded-2xl p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Strain Types</p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 rounded-full text-sm font-medium">
                    Sativa
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30 rounded-full text-sm font-medium">
                    Indica
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30 rounded-full text-sm font-medium">
                    Hybrid
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status Badges</p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-sm">
                    Active
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 rounded-full text-sm">
                    New
                  </span>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 border border-yellow-500/30 rounded-full text-sm">
                    Pending
                  </span>
                  <span className="px-3 py-1 bg-red-500/20 text-red-700 border border-red-500/30 rounded-full text-sm">
                    Revoked
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Simple Tags</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-sm">Fruity</span>
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-sm">Earthy</span>
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-sm">Citrus</span>
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-sm">Diesel</span>
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-sm">Sweet</span>
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-sm">Spicy</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Typography */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Typography</h2>
          <div className="bg-card rounded-2xl p-8 space-y-4">
            <p className="text-4xl font-bold text-foreground">Heading 1</p>
            <p className="text-3xl font-bold text-foreground">Heading 2</p>
            <p className="text-2xl font-semibold text-foreground">Heading 3</p>
            <p className="text-xl font-semibold text-foreground">Heading 4</p>
            <p className="text-lg text-foreground">Body Large</p>
            <p className="text-base text-foreground">Body Regular</p>
            <p className="text-sm text-foreground">Body Small</p>
            <p className="text-xs text-muted-foreground">Muted Text</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ColorSwatch({ name, variable }: { name: string; variable: string }) {
  return (
    <div className="space-y-2">
      <div
        className="h-16 rounded-xl border border-border"
        style={{ background: `var(${variable})` }}
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground font-mono">{variable}</p>
      </div>
    </div>
  );
}
