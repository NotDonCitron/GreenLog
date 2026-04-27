import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum von CannaLog — Cannabis Strain Tracking & Collection',
}

export default function ImpressumPage() {
  return (
    <div className="space-y-6">
      <h1>Impressum</h1>

      <section>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          CannaLog (Projektbetrieb)<br />
          c/o CannaLog Project Office<br />
          Berlin<br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:cannalog.official@gmail.com">cannalog.official@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          CannaLog Projektleitung
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
