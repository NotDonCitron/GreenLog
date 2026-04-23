export function sanitizeDisplayText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    // Strip everything from the first sentence-ending punctuation before "PHOTO BY"
    // e.g. "Lumpy. Photo by David Downs for Leafly." -> "Lumpy"
    .replace(/\s*[.,;:!]?\s*PHOTO BY\b.*$/i, "")
    // Strip trailing dot at end of string only
    .replace(/\s*\.$/, "")
    .replace(/\\"/g, '"')
    .replace(/"\s*$/, "")
    .trim();
}
