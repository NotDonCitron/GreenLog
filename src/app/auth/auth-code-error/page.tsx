import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">
        Anmeldung konnte nicht abgeschlossen werden
      </h1>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Der OAuth-Callback war unvollständig oder ist abgelaufen. Bitte starte die Google-Anmeldung erneut.
      </p>
      <Link
        href="/sign-in"
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-[#00F5FF] px-5 text-sm font-black uppercase tracking-[0.12em] text-black hover:bg-[#A1FAFF]"
      >
        Zur Anmeldung
      </Link>
    </main>
  );
}
