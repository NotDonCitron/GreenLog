type RelativeTimeOptions = {
  includeYearWhenDifferent?: boolean;
};

export function formatRelativeTime(
  dateString: string,
  now: Date = new Date(),
  options: RelativeTimeOptions = {}
): string {
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return "vor 1 Tag";
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: options.includeYearWhenDifferent && date.getFullYear() !== now.getFullYear()
      ? "numeric"
      : undefined,
  });
}
