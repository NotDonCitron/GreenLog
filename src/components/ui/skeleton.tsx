export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-[var(--muted)] rounded-xl ${className || ""}`} />
    );
}