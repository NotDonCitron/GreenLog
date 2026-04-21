"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default function SignUpPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) { setError("Passwörter stimmen nicht überein"); return; }
        if (password.length < 6) { setError("Passwort muss mindestens 6 Zeichen haben"); return; }
        setLoading(true);

        const { error } = await supabase.auth.signUp({ email, password });
        setLoading(false);

        if (error) { setError(error.message); return; }
        router.push("/");
        router.refresh();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
            <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 bg-[var(--card)] p-8 shadow-xl">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">Konto erstellen</h1>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">Willkommen bei CannaLog</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">E-Mail</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            placeholder="deine@email.de" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">Passwort</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            placeholder="••••••••" />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground)]">Passwort bestätigen</label>
                        <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                        {loading ? "Registrierung..." : "Konto erstellen"}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">Oder</span>
                    </div>
                </div>

                <GoogleAuthButton />

                <p className="text-center text-sm text-[var(--muted-foreground)]">
                    Bereits ein Konto? <Link href="/sign-in" className="text-[var(--primary)] hover:underline">Anmelden</Link>
                </p>
            </div>
        </div>
    );
}
