import { sanitizePublicQuickLogPayload } from "./quick-log";

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

export function buildPublicQuickLogActivityPayload(input: PublicQuickLogActivityInput) {
  return sanitizePublicQuickLogPayload(input);
}
