import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | GreenLog',
  },
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <article className="prose prose-invert max-w-none">
            {children}
          </article>
        </div>
      </main>
    </div>
  )
}
