export type StrainSourceTier = "primary" | "fallback" | "review";

export interface StrainSourcePolicy {
  key: string;
  label: string;
  tier: StrainSourceTier;
  requiresSourceNotes: boolean;
  summary: string;
}

const SOURCE_ALIASES: Record<string, string> = {
  leafly: "leafly",
  "leafly-curation": "leafly",
  allbud: "allbud",
  "allbud-curation": "allbud",
  askgrowers: "askgrowers",
  "askgrowers-review": "askgrowers",
  straindb: "straindb",
  "strain-database": "straindb",
  "strain-database.com": "straindb",
  "manual-curation": "manual-curation",
  "manual-user": "manual-curation",
};

const SOURCE_POLICIES: Record<string, StrainSourcePolicy> = {
  leafly: {
    key: "leafly",
    label: "Leafly",
    tier: "primary",
    requiresSourceNotes: false,
    summary: "Primaerquelle fuer breite Abdeckung und schnelle Bild-Recherche.",
  },
  allbud: {
    key: "allbud",
    label: "AllBud",
    tier: "fallback",
    requiresSourceNotes: false,
    summary: "Fallback-Quelle, wenn Leafly kein brauchbares Bild liefert.",
  },
  askgrowers: {
    key: "askgrowers",
    label: "AskGrowers",
    tier: "review",
    requiresSourceNotes: true,
    summary: "Nur nach manueller Pruefung verwenden; Stock- oder Similar-Image-Risiko.",
  },
  straindb: {
    key: "straindb",
    label: "Strain Database",
    tier: "review",
    requiresSourceNotes: true,
    summary: "Breite Datenquelle; Import vor Veroeffentlichung in der Admin-Queue pruefen.",
  },
  "manual-curation": {
    key: "manual-curation",
    label: "Manuelle Kuratierung",
    tier: "primary",
    requiresSourceNotes: false,
    summary: "Manuell geprueft und fuer GreenLog kuratiert.",
  },
  unknown: {
    key: "unknown",
    label: "Unbekannt",
    tier: "review",
    requiresSourceNotes: true,
    summary: "Quelle unklar; vor Publikation dokumentieren und manuell pruefen.",
  },
};

const STOCK_IMAGE_PATTERNS = [
  /stock photo/i,
  /similar to/i,
  /placeholder/i,
  /picsum/i,
];

export function normalizePrimarySource(value?: string | null): string {
  if (!value) return "unknown";

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  return SOURCE_ALIASES[normalized] ?? normalized;
}

export function getStrainSourcePolicy(value?: string | null): StrainSourcePolicy {
  const key = normalizePrimarySource(value);
  return SOURCE_POLICIES[key] ?? SOURCE_POLICIES.unknown;
}

export function buildDefaultSourceNotes(value?: string | null): string | null {
  const policy = getStrainSourcePolicy(value);

  switch (policy.key) {
    case "leafly":
      return "Leafly priorisieren, Bild vor Veroeffentlichung pruefen und anschliessend selbst hosten.";
    case "allbud":
      return "AllBud nur als Fallback nutzen, wenn Leafly kein brauchbares Bild liefert; Bild vor Veroeffentlichung selbst hosten.";
    case "askgrowers":
      return "AskGrowers nur nach manueller Pruefung verwenden; stock/similar Hinweise ausschliessen und Bild vor Veroeffentlichung selbst hosten.";
    case "straindb":
      return "Strain Database Import pruefen, Quellenhinweise dokumentieren und Bild vor Veroeffentlichung selbst hosten.";
    case "manual-curation":
      return "Manuell kuratiert und fuer GreenLog freigegeben; Bild vor Veroeffentlichung selbst hosten.";
    default:
      return null;
  }
}

export function detectSourceWarnings(input: {
  primarySource?: string | null;
  imageUrl?: string | null;
  sourceNotes?: string | null;
}): string[] {
  const warnings: string[] = [];
  const policy = getStrainSourcePolicy(input.primarySource);
  const haystack = `${input.imageUrl ?? ""} ${input.sourceNotes ?? ""}`;

  if (policy.tier === "fallback") {
    warnings.push("Fallback-Quelle: nur verwenden, wenn Leafly kein gutes Bild hat.");
  }

  if (policy.requiresSourceNotes && !input.sourceNotes?.trim()) {
    warnings.push("Quelle braucht dokumentierte manuelle Pruefung.");
  }

  if (STOCK_IMAGE_PATTERNS.some((pattern) => pattern.test(haystack))) {
    warnings.push("Quelle oder Notizen deuten auf Stock-/Placeholder-Bild hin.");
  }

  return warnings;
}
