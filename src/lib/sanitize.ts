export function sanitizeSlug(slug: string): string {
    return slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}
