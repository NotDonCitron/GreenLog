export const PUBLIC_QUICK_LOG_EFFECTS = [
  { value: "ruhe", label: "Ruhe" },
  { value: "fokus", label: "Fokus" },
  { value: "schlaf", label: "Schlaf" },
  { value: "kreativitaet", label: "Kreativität" },
  { value: "appetit", label: "Appetit" },
] as const;

export const PRIVATE_QUICK_LOG_SIDE_EFFECTS = [
  { value: "trocken", label: "Trocken" },
  { value: "unruhig", label: "Unruhig" },
  { value: "kopflastig", label: "Kopflastig" },
  { value: "couchlock", label: "Couchlock" },
] as const;

export const QUICK_LOG_STATUSES = [
  { value: "nochmal", label: "Nochmal" },
  { value: "situativ", label: "Situativ" },
  { value: "nicht_nochmal", label: "Nicht nochmal" },
] as const;

export type QuickLogEffectChip = (typeof PUBLIC_QUICK_LOG_EFFECTS)[number]["value"];
export type QuickLogSideEffect = (typeof PRIVATE_QUICK_LOG_SIDE_EFFECTS)[number]["value"];
export type QuickLogStatus = (typeof QUICK_LOG_STATUSES)[number]["value"];

const PUBLIC_QUICK_LOG_EFFECT_VALUES = new Set<string>(
  PUBLIC_QUICK_LOG_EFFECTS.map((effect) => effect.value)
);
const PRIVATE_QUICK_LOG_SIDE_EFFECT_VALUES = new Set<string>(
  PRIVATE_QUICK_LOG_SIDE_EFFECTS.map((effect) => effect.value)
);
const QUICK_LOG_STATUS_VALUES = new Set<string>(QUICK_LOG_STATUSES.map((status) => status.value));

export function isQuickLogEffect(value: unknown): value is QuickLogEffectChip {
  return typeof value === "string" && PUBLIC_QUICK_LOG_EFFECT_VALUES.has(value);
}

export function isQuickLogSideEffect(value: unknown): value is QuickLogSideEffect {
  return typeof value === "string" && PRIVATE_QUICK_LOG_SIDE_EFFECT_VALUES.has(value);
}

export function isQuickLogStatus(value: unknown): value is QuickLogStatus {
  return typeof value === "string" && QUICK_LOG_STATUS_VALUES.has(value);
}

export function normalizeQuickLogEffects(values: unknown): QuickLogEffectChip[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized: QuickLogEffectChip[] = [];
  const seen = new Set<QuickLogEffectChip>();

  for (const value of values) {
    if (isQuickLogEffect(value) && !seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  }

  return normalized;
}

export function normalizeQuickLogSideEffects(values: unknown): QuickLogSideEffect[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized: QuickLogSideEffect[] = [];
  const seen = new Set<QuickLogSideEffect>();

  for (const value of values) {
    if (isQuickLogSideEffect(value) && !seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  }

  return normalized;
}

type PublicQuickLogInput = {
  rating: number;
  strainSlug: string;
  effectChips: unknown;
  publicReviewText?: string | null;
  sideEffects?: unknown;
  privateStatus?: unknown;
  privateNote?: unknown;
  dose?: unknown;
  batch?: unknown;
  pharmacy?: unknown;
  setting?: unknown;
};

export function sanitizePublicQuickLogPayload(input: PublicQuickLogInput) {
  return {
    rating: Number(input.rating.toFixed(1)),
    strain_slug: input.strainSlug,
    effect_chips: normalizeQuickLogEffects(input.effectChips),
    public_review_text: input.publicReviewText?.trim() || null,
  };
}
