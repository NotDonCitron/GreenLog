export const PUBLIC_STREAK_ACTIVITY_TYPES = [
  "rating",
  "favorite_added",
  "strain_collected",
] as const;

export type PublicStreakActivityType = (typeof PUBLIC_STREAK_ACTIVITY_TYPES)[number];

const PUBLIC_STREAK_ACTIVITY_TYPE_SET = new Set<string>(PUBLIC_STREAK_ACTIVITY_TYPES);

export function isPublicStreakActivityType(activityType: string): activityType is PublicStreakActivityType {
  return PUBLIC_STREAK_ACTIVITY_TYPE_SET.has(activityType);
}

type PublicRatingActivityInput = {
  rating: number;
  strainSlug: string;
  reviewText?: string | null;
  dose?: string | null;
  batch?: string | null;
  pharmacy?: string | null;
  privateNotes?: string | null;
};

export function buildPublicRatingActivityPayload(input: PublicRatingActivityInput) {
  return {
    rating: Number(input.rating.toFixed(1)),
    strain_slug: input.strainSlug,
    public_review_text: input.reviewText?.trim() || null,
  };
}

type PublicQuickLogActivityInput = {
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

const PUBLIC_QUICK_LOG_EFFECT_ALLOWLIST = new Set([
  "ruhe",
  "fokus",
  "schlaf",
  "kreativitaet",
  "appetit",
]);

export function buildPublicQuickLogActivityPayload(input: PublicQuickLogActivityInput) {
  const effect_chips = Array.isArray(input.effectChips)
    ? input.effectChips
        .filter((value): value is string => typeof value === "string")
        .filter((value) => PUBLIC_QUICK_LOG_EFFECT_ALLOWLIST.has(value))
    : [];

  return {
    rating: Number(input.rating.toFixed(1)),
    strain_slug: input.strainSlug,
    effect_chips,
    public_review_text:
      typeof input.publicReviewText === "string" && input.publicReviewText.trim().length > 0
        ? input.publicReviewText.trim()
        : null,
  };
}
