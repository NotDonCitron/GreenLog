"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Leaf, Loader2, LockKeyhole, Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AUTH_REQUEST_TIMEOUT_MS = 12_000;

function isTimeoutError(error: unknown) {
    return error instanceof Error && error.name === "TimeoutError";
}

function isAbortError(error: unknown) {
    return error instanceof Error && error.name === "AbortError";
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

function getFriendlySignUpError(error: unknown) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "Registrierung aktuell nicht erreichbar. Bitte versuche es erneut.";
}

export default function SignUpPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwörter stimmen nicht überein.");
            return;
        }

        if (password.length < 6) {
            setError("Passwort muss mindestens 6 Zeichen haben.");
            return;
        }

        if (!acceptedPrivacy) {
            setError("Bitte bestätige die Datenschutzerklärung.");
            return;
        }

        setLoading(true);

        try {
            let session: { access_token: string; refresh_token: string } | null = null;

            try {
                const response = await withTimeout(
                    fetch("/api/auth/sign-up", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email, password }),
                    }),
                    "sign-up request"
                );

                const payload = await response.json();

                if (!response.ok) {
                    throw new Error(payload?.error || "Registrierung fehlgeschlagen");
                }

                const nextSession = payload?.session;
                if (nextSession?.access_token && nextSession?.refresh_token) {
                    session = nextSession;
                }
            } catch (proxyError) {
                console.warn("[SignUpPage] local sign-up proxy unavailable, falling back to direct auth", proxyError);
            }

            if (!session) {
                const { data, error: signUpError } = await withTimeout(
                    supabase.auth.signUp({ email, password }),
                    "direct sign-up"
                );

                if (signUpError) {
                    throw signUpError;
                }

                if (data.session?.access_token && data.session?.refresh_token) {
                    session = data.session;
                } else {
                    const { data: signInData, error: signInError } = await withTimeout(
                        supabase.auth.signInWithPassword({ email, password }),
                        "post sign-up sign-in"
                    );

                    if (!signInError && signInData.session?.access_token && signInData.session?.refresh_token) {
                        session = signInData.session;
                    }
                }
            }

            if (!session?.access_token || !session?.refresh_token) {
                setError("Konto erstellt. Bitte bestätige ggf. deine E-Mail und melde dich danach an.");
                router.push("/sign-in");
                return;
            }

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
            });

            if (sessionError) {
                throw sessionError;
            }

            router.push("/");
            router.refresh();
        } catch (err) {
            console.error("[SignUpPage] sign-up request failed", err);
            setError(
                isTimeoutError(err) || isAbortError(err)
                    ? "Registrierung hat zu lange gebraucht. Bitte versuche es erneut."
                    : getFriendlySignUpError(err)
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
                        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/80 shadow-lg shadow-[#2FF801]/10">
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

                    <Link href="/landing" className="hidden text-[10px] font-black uppercase tracking-[0.25em] text-[var(--muted-foreground)] transition-colors hover:text-[#2FF801] sm:block">
                        Zur Landing
                    </Link>
                </header>

                <div className="grid flex-1 items-center gap-8 py-8 sm:py-12 lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="max-w-xl">
                        <h1 className="font-display text-4xl font-black italic uppercase leading-[0.9] tracking-tight text-white sm:text-6xl">
                            Starte dein Logbuch.
                        </h1>
                        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted-foreground)] sm:mt-5 sm:text-base">
                            Erstelle deinen Account und lege direkt mit Strains, Grows und Community-Updates los.
                        </p>

                        <div className="mt-8 hidden max-w-lg gap-3 sm:grid sm:grid-cols-2">
                            <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/55 p-4 backdrop-blur-xl">
                                <Leaf className="mb-3 text-[#2FF801]" size={22} />
                                <h2 className="font-display text-sm font-black uppercase tracking-tight">Persönlich</h2>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                                    Deine privaten Notizen und Logs bleiben unter deiner Kontrolle.
                                </p>
                            </div>
                            <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/55 p-4 backdrop-blur-xl">
                                <Sprout className="mb-3 text-[#00F5FF]" size={22} />
                                <h2 className="font-display text-sm font-black uppercase tracking-tight">Community</h2>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                                    Teile Aktivitäten mit deiner Community, wenn du es möchtest.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="w-full justify-self-end lg:max-w-md">
                        <div className="glass-surface rounded-lg border border-[var(--border)]/70 bg-[var(--card)]/85 p-5 shadow-2xl shadow-black/40 sm:p-7">
                            <div className="mb-7 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#2FF801]">
                                        Account
                                    </p>
                                    <h2 className="mt-2 font-display text-3xl font-black italic uppercase leading-none tracking-tight">
                                        Registrieren
                                    </h2>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2FF801]/25 bg-[#2FF801]/10 text-[#2FF801]">
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
                                        className="h-12 border-white/10 bg-white/5 px-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus-visible:border-[#2FF801]"
                                        placeholder="deine@email.de"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                                        Passwort
                                    </label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className="h-12 border-white/10 bg-white/5 px-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus-visible:border-[#2FF801]"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                                        Passwort bestätigen
                                    </label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        className="h-12 border-white/10 bg-white/5 px-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus-visible:border-[#2FF801]"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <label className="flex items-start gap-3 rounded-lg border border-[var(--border)]/60 bg-white/5 p-3 text-sm text-[var(--muted-foreground)]">
                                    <input
                                        type="checkbox"
                                        checked={acceptedPrivacy}
                                        onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                                        required
                                        className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent text-[#2FF801] focus:ring-[#2FF801]"
                                    />
                                    <span>
                                        Ich habe die{" "}
                                        <Link href="/datenschutz" className="font-semibold text-[#2FF801] hover:text-[#A7FF8A] hover:underline">
                                            Datenschutzerklärung
                                        </Link>{" "}
                                        gelesen und akzeptiere sie.
                                    </span>
                                </label>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-12 w-full bg-[#2FF801] text-sm font-black uppercase tracking-[0.18em] text-black shadow-lg shadow-[#2FF801]/20 hover:bg-[#A7FF8A]"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Registrierung...
                                        </>
                                    ) : (
                                        <>
                                            Konto erstellen
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
                                Bereits registriert?{" "}
                                <Link href="/sign-in" className="font-bold text-[#00F5FF] transition-colors hover:text-[#A1FAFF]">
                                    Anmelden
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
