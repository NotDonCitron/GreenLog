import Link from "next/link";

export default function AgeRejectedPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <span className="text-4xl">🚫</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase italic tracking-tight font-display text-[var(--foreground)]">
            Leider nein
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            GreenLog ist nur für Personen zugänglich, die das gesetzliche Mindestalter (18+) für Cannabis-Produkte in ihrem Land erreicht haben.
          </p>
        </div>

        <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)] space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
            Was du wissen solltest
          </p>
          <ul className="text-sm text-[var(--muted-foreground)] space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-[#2FF801]">•</span>
              Der Zugang ist aus rechtlichen Gründen beschränkt
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2FF801]">•</span>
              Wir überprüfen das Alter beim ersten Besuch
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2FF801]">•</span>
              Bei Fragen wende dich an einen Erwachsenen
            </li>
          </ul>
        </div>

        <Link
          href="/"
          className="block w-full py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-bold uppercase tracking-widest hover:border-[#00F5FF]/50 transition-all"
        >
          Zurück zur Startseite
        </Link>

        <p className="text-[9px] text-[var(--muted-foreground)]/40 uppercase tracking-widest">
          GreenLog — Cannabis Strain Tracking
        </p>
      </div>
    </main>
  );
}
