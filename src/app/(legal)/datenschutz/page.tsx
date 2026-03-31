import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung von GreenLog — Cannabis Strain Tracking & Collection',
}

export default function DatenschutzPage() {
  return (
    <div className="space-y-8">
      <h1>Datenschutzerklärung</h1>
      <p><strong>Stand:</strong> 31. März 2026</p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          GreenLog<br />
          E-Mail: <a href="mailto:datenschutz@greenlog.app">datenschutz@greenlog.app</a>
        </p>
      </section>

      <section>
        <h2>2. Erhobene Daten</h2>
        <p>Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
        <ul>
          <li><strong>Account-Daten:</strong> E-Mail-Adresse, Passwort (verschlüsselt)</li>
          <li><strong>Profil-Daten:</strong> Benutzername, Bio, Profilbild</li>
          <li><strong>Strain-Daten:</strong> Bewertungen, Favoriten, Sammlungs-Notizen</li>
          <li><strong>Aktivitätsdaten:</strong> Follows, Community-Beiträge, Badge-Fortschritt</li>
        </ul>
      </section>

      <section>
        <h2>3. Zweck der Verarbeitung</h2>
        <p>Ihre Daten werden verwendet für:</p>
        <ul>
          <li>Bereitstellung des GreenLog-Dienstes</li>
          <li>Verwaltung Ihres Accounts</li>
          <li>Speicherung Ihrer Strain-Sammlung und Bewertungen</li>
          <li>Social-Features (Follower, Community)</li>
          <li>Badge-System und Gamification</li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies</h2>
        <p>Wir verwenden folgende Cookie-Kategorien:</p>
        <ul>
          <li><strong>Essenzielle Cookies:</strong> Für die Funktionalität des Dienstes erforderlich (Authentifizierung, Session)</li>
          <li><strong>Analyse-Cookies:</strong> Werden erst nach Ihrer Zustimmung gesetzt</li>
        </ul>
        <p>
          Sie können Ihre Cookie-Präferenzen jederzeit über den Banner am Seitenende ändern.
        </p>
      </section>

      <section>
        <h2>5. Weitergabe an Dritte</h2>
        <p>Ihre Daten werden an folgende Auftragsverarbeiter weitergegeben:</p>
        <ul>
          <li><strong>Supabase:</strong> Datenbank- und Authentifizierungsinfrastruktur (Auftragsverarbeiter gemäß Art. 28 DSGVO)</li>
          <li><strong>Vercel:</strong> Hosting-Infrastruktur</li>
        </ul>
      </section>

      <section>
        <h2>6. Ihre Rechte</h2>
        <p>Sie haben das Recht auf:</p>
        <ul>
          <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung ("Recht auf Vergessenwerden") (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p>Um Ihre Rechte auszuüben, kontaktieren Sie uns unter: <a href="mailto:datenschutz@greenlog.app">datenschutz@greenlog.app</a></p>
      </section>

      <section>
        <h2>7. Speicherdauer</h2>
        <p>
          Wir speichern Ihre Daten solange Ihr Account existiert. Nach Löschung Ihres Accounts
          werden die Daten innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen
          Aufbewahrungspflichten bestehen.
        </p>
      </section>
    </div>
  )
}
