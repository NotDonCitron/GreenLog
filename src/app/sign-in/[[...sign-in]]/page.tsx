"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        router.push("/");
        router.refresh();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
            <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 bg-[var(--card)] p-8 shadow-xl">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">Anmelden</h1>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">Willkommen zurück bei CannaLog</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">E-Mail</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            placeholder="deine@email.de" />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">Passwort</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            placeholder="••••••••" />
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                        {loading ? "Anmeldung..." : "Anmelden"}
                    </button>
                </form>

                <p className="text-center text-sm text-[var(--muted-foreground)]">
                    Noch kein Konto?{" "}
                    <Link href="/sign-up" className="text-[var(--primary)] hover:underline">Registrieren</Link>
                </p>
            </div>
        </div>
    );
}
