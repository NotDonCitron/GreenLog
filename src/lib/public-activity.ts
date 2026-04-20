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
