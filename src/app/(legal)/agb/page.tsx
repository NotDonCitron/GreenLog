import type { Metadata } from 'next'
import { SUPPORT_EMAIL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen von CannaLog — Widerrufsrecht, Zahlungsbedingungen, Vertragsschluss und Kündigung.',
}

export default function AGBPage() {
  return (
    <div className="space-y-8">
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
      <p><strong>Stand:</strong> 31. März 2026</p>

      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der CannaLog-Plattform.
          Mit der Registrierung und Nutzung akzeptieren Sie diese AGB.
        </p>
      </section>

      <section>
        <h2>2. Leistungsbeschreibung</h2>
        <p>
          CannaLog bietet eine Plattform zur Verwaltung von Cannabis-Strains, Sammlungen
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
          CannaLog übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder
          Aktualität der bereitgestellten Strain-Informationen. Die Plattform ersetzt
          keine professionelle Beratung.
        </p>
      </section>

      <section>
        <h2>6. Geistiges Eigentum</h2>
        <p>
          Die CannaLog-Plattform und deren Inhalte sind urheberrechtlich geschützt.
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
        <h2>8. Widerrufsrecht</h2>
        <p>
          Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Sofern Sie als Verbraucher
          handeln, können Sie Ihre Vertragserklärung innerhalb von 14 Tagen ohne Angabe von
          Gründen widerrufen. Die Widerrufsfrist beginnt mit dem Tag des Vertragsschlusses.
          Um Ihr Widerrufsrecht auszuüben, genügt eine eindeutige Erklärung (z. B. per
          E-Mail an <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>).
        </p>
      </section>

      <section>
        <h2>9. Zahlungsbedingungen</h2>
        <p>
          Kostenpflichtige Premium-Features werden über die angebotenen Zahlungsmethoden
          abgerechnet. Alle Preise verstehen sich in Euro inklusive der gesetzlichen
          Umsatzsteuer. Die Bezahlung erfolgt je nach gewählter Zahlungsmethode im Voraus.
          Bei Zahlungsverzug sind wir berechtigt, den Zugang zu Premium-Features zu sperren.
        </p>
      </section>

      <section>
        <h2>10. Vertragsschluss und Laufzeit</h2>
        <p>
          Der Vertrag über die Nutzung der CannaLog-Plattform kommt mit der erfolgreichen
          Registrierung zustande. Premium-Abonnements werden für die gewählte Laufzeit
          (monatlich oder jährlich) abgeschlossen und verlängern sich automatisch, sofern
          sie nicht mindestens 30 Tage vor Ende der Laufzeit gekündigt werden.
        </p>
      </section>

      <section>
        <h2>11. Kündigung und Account-Löschung</h2>
        <p>
          Sie können Ihren Account jederzeit löschen. Die Löschung kann über die
          Account-Einstellungen oder per E-Mail an <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> erfolgen.
          Nach der Löschung werden Ihre personenbezogenen Daten gemäß unserer
          Datenschutzerklärung verarbeitet und gelöscht. Laufende Premium-Abos werden
          nicht rückerstattet.
        </p>
      </section>

      <section>
        <h2>12. Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Soweit gesetzlich zulässig,
          ist Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesen
          AGB der Sitz von CannaLog.
        </p>
      </section>
    </div>
  )
}
