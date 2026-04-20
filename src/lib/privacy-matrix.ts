export type PrivacyFieldKey =
  | "username"
  | "avatar"
  | "display_name"
  | "bio"
  | "badges"
  | "follow_counts"
  | "favorites"
  | "tried_strains"
  | "star_ratings"
  | "review_text"
  | "activity_feed"
  | "club_membership_label"
  | "dose"
  | "batch"
  | "stock"
  | "pharmacy"
  | "dispensations"
  | "exact_quantities"
  | "private_notes"
  | "medical_context"
  | "private_grow_photos"
  | "organization_inventory"
  | "audit_details";

export type PrivacyField = {
  key: PrivacyFieldKey;
  label: string;
  reason: string;
};

export const PUBLIC_BY_DEFAULT_FIELDS: PrivacyField[] = [
  { key: "username", label: "Username", reason: "Required for social profiles" },
  { key: "avatar", label: "Avatar", reason: "User-controlled profile identity" },
  { key: "display_name", label: "Display name", reason: "User-controlled profile identity" },
  { key: "bio", label: "Bio", reason: "User-controlled public profile text" },
  { key: "badges", label: "Badges", reason: "Low sensitivity and strong social value" },
  { key: "follow_counts", label: "Follower counts", reason: "Counts only, not private records" },
];

export const OPTIONAL_PUBLIC_FIELDS: PrivacyField[] = [
  { key: "favorites", label: "Favoriten", reason: "Taste signal controlled by profile settings" },
  { key: "tried_strains", label: "Probiert", reason: "Taste signal controlled by profile settings" },
  { key: "star_ratings", label: "Bewertungen", reason: "Per-rating or default sharing control" },
  { key: "review_text", label: "Reviews", reason: "Per-review sharing control" },
  { key: "activity_feed", label: "Aktivitäten", reason: "Derived only from public source data" },
  {
    key: "club_membership_label",
    label: "Club-Zugehörigkeit",
    reason: "Requires user and organization opt-in",
  },
];

export const ALWAYS_PRIVATE_FIELDS: PrivacyField[] = [
  { key: "dose", label: "Dosis", reason: "Sensitive consumption or health-adjacent data" },
  { key: "batch", label: "Charge", reason: "Supply and compliance data" },
  { key: "stock", label: "Bestand", reason: "Sensitive possession data" },
  { key: "pharmacy", label: "Apotheke", reason: "Health and supply context" },
  { key: "dispensations", label: "CSC-Abgaben", reason: "Club compliance data" },
  { key: "exact_quantities", label: "Exakte Mengen", reason: "Compliance and personal risk" },
  { key: "private_notes", label: "Private Notizen", reason: "Explicitly private user expectation" },
  { key: "medical_context", label: "Medizinischer Kontext", reason: "Special-category risk" },
  {
    key: "private_grow_photos",
    label: "Private Grow-Bilder",
    reason: "Location and identity risk",
  },
  {
    key: "organization_inventory",
    label: "Organisationsbestand",
    reason: "B2B compliance data",
  },
  { key: "audit_details", label: "Audit-Details", reason: "Organization-internal compliance data" },
];

const ALWAYS_PRIVATE_KEYS = new Set(ALWAYS_PRIVATE_FIELDS.map((field) => field.key));

export function isAlwaysPrivateField(key: string): boolean {
  return ALWAYS_PRIVATE_KEYS.has(key as PrivacyFieldKey);
}
