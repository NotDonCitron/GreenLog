"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowRight, Leaf, Loader2, LockKeyhole, Sprout } from "lucide-react";

const AUTH_REQUEST_TIMEOUT_MS = 12_000;

function isTimeoutError(error: unknown) {
    return error instanceof Error && error.name === "TimeoutError";
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = AUTH_REQUEST_TIMEOUT_MS): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    const error = new Error(`${label} timed out after ${timeoutMs}ms`);
                    error.name = "TimeoutError";
                    reject(error);
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

function getFriendlySignInError(error: unknown) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "Anmeldung aktuell nicht erreichbar. Bitte versuche es erneut.";
}

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            let session: { access_token: string; refresh_token: string } | null = null;

            try {
                const response = await withTimeout(
                    fetch("/api/auth/sign-in", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email, password }),
                    }),
                    "sign-in request"
                );

                const payload = await response.json();

                if (!response.ok) {
                    if (response.status < 500) {
                        setError(payload?.error?.message || "Anmeldung fehlgeschlagen");
                        return;
                    }
                    throw new Error(payload?.error?.message || "Sign-in proxy unavailable");
                }

                const nextSession = payload?.data?.session;
                if (!nextSession?.access_token || !nextSession?.refresh_token) {
                    throw new Error("Anmeldung fehlgeschlagen");
                }

                session = nextSession;
            } catch (proxyError) {
                console.warn("[SignInPage] local sign-in proxy unavailable, falling back to direct auth", proxyError);

                const { data, error: directError } = await withTimeout(
                    supabase.auth.signInWithPassword({ email, password }),
                    "direct sign-in"
                );

                if (directError) {
                    setError(directError.message);
                    return;
                }

                if (!data.session?.access_token || !data.session?.refresh_token) {
                    setError("Anmeldung fehlgeschlagen");
                    return;
                }

                session = data.session;
            }

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
            });

            if (sessionError) {
                setError(sessionError.message);
                return;
            }

            router.push("/");
            router.refresh();
        } catch (err) {
            console.error("[SignInPage] sign-in request failed", err);
            setError(
                isTimeoutError(err)
                    ? "Anmeldung hat zu lange gebraucht. Bitte versuche es erneut."
                    : getFriendlySignInError(err)
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
            <div className="fixed inset-0 pointer-events-none bg-[#0d0d0e]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.055),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_42%,rgba(255,255,255,0.025))]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:44px_44px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.46)_78%)]" />
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
                <header className="flex items-center justify-between">
                    <Link href="/" className="group flex items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/80 shadow-lg shadow-[#00F5FF]/10">
                            <img
                                src="/logo.png"
                                alt="CannaLog Logo"
                                className="h-full w-full object-contain p-1.5 transition-transform duration-500 group-hover:rotate-6"
                            />
                        </div>
                        <div>
                            <p className="font-display text-xl font-black italic uppercase leading-none tracking-tight text-white">
                                CannaLog
                            </p>
                        </div>
                    </Link>

                    <Link href="/landing" className="hidden text-[10px] font-black uppercase tracking-[0.25em] text-[var(--muted-foreground)] transition-colors hover:text-[#00F5FF] sm:block">
                        Zur Landing
                    </Link>
                </header>

                <div className="grid flex-1 items-center gap-8 py-8 sm:py-12 lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="max-w-xl">
                        <h1 className="font-display text-4xl font-black italic uppercase leading-[0.9] tracking-tight text-white sm:text-6xl">
                            Dein Logbuch wartet.
                        </h1>
                        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted-foreground)] sm:mt-5 sm:text-base">
                            Strains verwalten, Grows weiterführen und Community-Aktivitäten im Blick behalten.
                        </p>

                        <div className="mt-8 hidden max-w-lg gap-3 sm:grid sm:grid-cols-2">
                            <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/55 p-4 backdrop-blur-xl">
                                <Leaf className="mb-3 text-[#00F5FF]" size={22} />
                                <h2 className="font-display text-sm font-black uppercase tracking-tight">Strain-Kompass</h2>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                                    Favoriten, Notizen und Bewertungen bleiben griffbereit.
                                </p>
                            </div>
                            <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/55 p-4 backdrop-blur-xl">
                                <Sprout className="mb-3 text-[#2FF801]" size={22} />
                                <h2 className="font-display text-sm font-black uppercase tracking-tight">Grow-Tagebuch</h2>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                                    Aktive Pflanzen, Timeline und Erinnerungen bleiben sortiert.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="w-full justify-self-end lg:max-w-md">
                        <div className="glass-surface rounded-lg border border-[var(--border)]/70 bg-[var(--card)]/85 p-5 shadow-2xl shadow-black/40 sm:p-7">
                            <div className="mb-7 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#00F5FF]">
                                        Account
                                    </p>
                                    <h2 className="mt-2 font-display text-3xl font-black italic uppercase leading-none tracking-tight">
                                        Anmelden
                                    </h2>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#00F5FF]/25 bg-[#00F5FF]/10 text-[#00F5FF]">
                                    <LockKeyhole size={20} />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
                                        <AlertCircle className="mt-0.5 shrink-0" size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                                        E-Mail
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="h-12 border-white/10 bg-white/5 px-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus-visible:border-[#00F5FF]"
                                        placeholder="deine@email.de"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <label htmlFor="password" className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                                            Passwort
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setForgotPasswordOpen(true)}
                                            className="text-xs font-bold text-[#00F5FF] transition-colors hover:text-[#A1FAFF]"
                                        >
                                            Passwort vergessen
                                        </button>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="h-12 border-white/10 bg-white/5 px-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus-visible:border-[#00F5FF]"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-12 w-full bg-[#00F5FF] text-sm font-black uppercase tracking-[0.18em] text-black shadow-lg shadow-[#00F5FF]/20 hover:bg-[#A1FAFF]"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Anmeldung...
                                        </>
                                    ) : (
                                        <>
                                            Anmelden
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-[var(--border)]/60"></span>
                                </div>
                                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
                                    <span className="bg-[var(--card)] px-3 text-[var(--muted-foreground)]">Oder</span>
                                </div>
                            </div>

                            <GoogleAuthButton />

                            <div className="mt-6 border-t border-[var(--border)]/60 pt-5 text-center text-sm text-[var(--muted-foreground)]">
                                Noch kein Konto?{" "}
                                <Link href="/sign-up" className="font-bold text-[#2FF801] transition-colors hover:text-[#A7FF8A]">
                                    Konto erstellen
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            <ForgotPasswordDialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
        </main>
    );
}
