import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum von CannaLog — Cannabis Strain Tracking & Collection',
}

export default function ImpressumPage() {
  return (
    <div className="space-y-6">
      <h1>Impressum</h1>

      {/* TODO: Team muss entscheiden wer Betreiber ist */}
      <div style={{ backgroundColor: 'var(--warning)', padding: '12px', borderRadius: '8px', color: 'var(--foreground)' }}>
        <strong>⏳ In Bearbeitung</strong> — Impressum-Details werden mit Team geklärt.
        Bitte kontaktiere uns für geschäftliche Anfragen.
      </div>

      <section>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          {/* TBD: Name und Anschrift */}
          [Name des Betreibers]<br />
          [Straße und Hausnummer]<br />
          [PLZ, Ort]<br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          {/* TBD: Name des Verantwortlichen */}
          [Name]
        </p>
      </section>

      <section>
        <h2>Haftungshinweis</h2>
        <p>
          Die Inhalte dieser Webseite dienen der allgemeinen Information und stellen keine
          rechtliche Beratung dar. Trotz sorgfältiger Recherche übernehmen wir keine Gewähr
          für die Aktualität, Richtigkeit oder Vollständigkeit der bereitgestellten Inhalte.
        </p>
      </section>
    </div>
  )
}
