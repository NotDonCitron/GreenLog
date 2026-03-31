import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum of GreenLog — Cannabis Strain Tracking & Collection',
}

export default function ImpressumEnPage() {
  return (
    <div className="space-y-6">
      <h1>Impressum (Legal Notice)</h1>

      {/* TODO: Team decision pending */}
      <div style={{ backgroundColor: 'var(--warning)', padding: '12px', borderRadius: '8px', color: 'var(--foreground)' }}>
        <strong>⏳ Pending</strong> — Impressum details to be confirmed with team.
        Please contact us for business inquiries.
      </div>

      <section>
        <h2>Information according to § 5 TMG (German Telemedia Act)</h2>
        <p>
          {/* TBD: Operator details */}
          [Operator Name]<br />
          [Street Address]<br />
          [Postal Code, City]<br />
          Germany
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Email: <a href="mailto:info@greenlog.app">info@greenlog.app</a>
        </p>
      </section>
    </div>
  )
}