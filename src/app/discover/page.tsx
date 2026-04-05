"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiscoverRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/feed");
    }, [router]);

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
            <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-widest">Weiterleitung...</p>
        </div>
    );
}
