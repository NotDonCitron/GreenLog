export function sanitizeDisplayText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/\s*\.?\s*PHOTO BY\b.*$/i, "")
    .replace(/\\"/g, '"')
    .replace(/"\s*$/, "")
    .trim();
}
