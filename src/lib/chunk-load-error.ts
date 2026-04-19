export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const text = `${error.name} ${error.message}`.toLowerCase();

  return (
    text.includes("chunkloaderror") ||
    text.includes("loading chunk") ||
    text.includes("failed to fetch dynamically imported module") ||
    text.includes("importing a module script failed")
  );
}
