import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen von GreenLog',
}

export default function AGBPage() {
  return (
    <div className="space-y-8">
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
      <p><strong>Stand:</strong> 31. März 2026</p>

      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der GreenLog-Plattform.
          Mit der Registrierung und Nutzung akzeptieren Sie diese AGB.
        </p>
      </section>

      <section>
        <h2>2. Leistungsbeschreibung</h2>
        <p>
          GreenLog bietet eine Plattform zur Verwaltung von Cannabis-Strains, Sammlungen
          und Community-Features. Die Grundfunktionen sind kostenlos nutzbar.
        </p>
      </section>

      <section>
        <h2>3. Registrierung und Account</h2>
        <p>
          Die Registrierung erfordert eine gültige E-Mail-Adresse. Sie sind verantwortlich
          für die Vertraulichkeit Ihrer Zugangsdaten und für alle Aktivitäten unter Ihrem Account.
        </p>
      </section>

      <section>
        <h2>4. Nutzungsbedingungen</h2>
        <p>Sie verpflichten sich:</p>
        <ul>
          <li>Keine falschen oder irreführenden Strain-Bewertungen zu erstellen</li>
          <li>Keine Inhalte zu veröffentlichen, die gegen geltendes Recht verstoßen</li>
          <li>Die Privatsphäre anderer Nutzer zu respektieren</li>
          <li>Keinen Missbrauch der Plattform zu betreiben</li>
        </ul>
      </section>

      <section>
        <h2>5. Haftungsausschluss</h2>
        <p>
          GreenLog übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder
          Aktualität der bereitgestellten Strain-Informationen. Die Plattform ersetzt
          keine professionelle Beratung.
        </p>
      </section>

      <section>
        <h2>6. Geistiges Eigentum</h2>
        <p>
          Die GreenLog-Plattform und deren Inhalte sind urheberrechtlich geschützt.
          Vervielfältigung oder Weiterverwendung bedarf der vorherigen schriftlichen Zustimmung.
        </p>
      </section>

      <section>
        <h2>7. Änderung der AGB</h2>
        <p>
          Wir behalten uns vor, diese AGB jederzeit zu ändern. Über wesentliche Änderungen
          werden Sie per E-Mail informiert. Die aktuelle Version finden Sie stets hier.
        </p>
      </section>

      <section>
        <h2>8. Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland.
        </p>
      </section>
    </div>
  )
}
