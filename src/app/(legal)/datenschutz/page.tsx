import type { Metadata } from 'next'
import { PRIVACY_EMAIL, PUBLIC_SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung von GreenLog — Medical Cannabis Journal & Strain Tracker',
}

export default function DatenschutzPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1>Datenschutzerklärung</h1>
        <p><strong>Stand:</strong> April 2026 — Version 1.0</p>
      </div>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          <strong>GreenLog</strong><br />
          E-Mail: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a><br />
          Internet: <a href={PUBLIC_SITE_URL}>{PUBLIC_SITE_URL}</a>
        </p>
      </section>

      <section>
        <h2>2. Erhobene Daten</h2>
        <p>Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
        
        <h3>2.1 Account-Daten</h3>
        <ul>
          <li>E-Mail-Adresse (Pflichtfeld)</li>
          <li>Passwort (verschlüsselt gespeichert)</li>
          <li>Profilbild (optional)</li>
        </ul>
        
        <h3>2.2 Sammlungs- und Bewertungsdaten</h3>
        <ul>
          <li>Strain-Bewertungen (1-5 Sterne)</li>
          <li>Persönliche Notizen zu Strains</li>
          <li>Fotos-Upload (von dir selbst aufgenommene Bilder)</li>
          <li>Batch-Informationen (Apotheke, Kaufdatum, Chargennummer)</li>
          <li>THC/CBD-Werte (falls von dir eingegeben)</li>
        </ul>
        
        <h3>2.3 Grow-Tracker-Daten</h3>
        <ul>
          <li>Grow-Einträge (Datum, Pflanzenart, Wachstumsstadium)</li>
          <li>Anbau-Notizen</li>
          <li>Environment-Daten (Temperatur, Feuchtigkeit)</li>
          <li>Fotos von Pflanzen</li>
        </ul>
        
        <h3>2.4 Aktivitätsdaten</h3>
        <ul>
          <li>Follows (wem du folgst / wer dir folgt)</li>
          <li>Community-Beiträge</li>
          <li>Badge-Fortschritt und erhaltene Badges</li>
          <li>XP-Level und Statistiken</li>
        </ul>
        
        <h3>2.5 Technische Daten</h3>
        <ul>
          <li>IP-Adresse (bei Registrierung und Login)</li>
          <li>Browser-Typ und Geräteinformationen</li>
          <li>Zugriffszeiten</li>
        </ul>
      </section>

      <section>
        <h2>3. Besondere Kategorien — Gesundheitsdaten (Art. 9 DSGVO)</h2>
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 my-4">
          <p className="text-sm">
            <strong>⚠️ Wichtiger Hinweis:</strong> Da GreenLog für die Dokumentation von 
            <strong> medizinischem Cannabis</strong> genutzt wird, verarbeiten wir implizit 
            <strong> Gesundheitsdaten</strong> (z.B. medizinische Indikationen in persönlichen Notizen). 
            Diese Daten fallen unter Art. 9 Abs. 1 DSGVO und erfordern Ihre 
            <strong> explizite Einwilligung</strong>.
          </p>
        </div>
        <p>
          Beispiele für Gesundheitsdaten, die verarbeitet werden können:
        </p>
        <ul>
          <li>Medizinische Indikationen in Notizen (&ldquo;hilfreich bei Schmerzen&rdquo;)</li>
          <li>Therapieverläufe über vergangene Strain-Bewertungen</li>
          <li>Selbstdiagnosen in persönlichen Notizen</li>
        </ul>
      </section>

      <section>
        <h2>4. Zweck der Verarbeitung</h2>
        <p>Ihre Daten werden für folgende Zwecke verwendet:</p>
        <ul>
          <li>Bereitstellung des GreenLog-Dienstes</li>
          <li>Verwaltung Ihres Accounts</li>
          <li>Speicherung Ihrer Strain-Sammlung und Bewertungen</li>
          <li>Social-Features (Follower, Community)</li>
          <li>Badge-System und Gamification</li>
          <li>Kommunikation mit Ihnen</li>
          <li>Support und Fehlerbehebung</li>
        </ul>
      </section>

      <section>
        <h2>5. Rechtsgrundlagen</h2>
        
        <h3>5.1 Allgemeine personenbezogene Daten (Art. 6 DSGVO)</h3>
        <ul>
          <li><strong>Art. 6(1)(b) — Vertragserfüllung:</strong> Bereitstellung des Dienstes</li>
          <li><strong>Art. 6(1)(c) — Rechtliche Verpflichtung:</strong> Buchhaltung, steuerliche Pflichten</li>
          <li><strong>Art. 6(1)(f) — Berechtigtes Interesse:</strong> Sicherheit, Fraud-Prävention</li>
          <li><strong>Art. 6(1)(a) — Einwilligung:</strong> E-Mail-Marketing</li>
        </ul>
        
        <h3>5.2 Besondere Kategorien — Gesundheitsdaten (Art. 9 DSGVO)</h3>
        <ul>
          <li>
            <strong>Art. 9(2)(a) — Explizite Einwilligung:</strong> Verarbeitung von Gesundheitsdaten
          </li>
        </ul>
        <p>
          <em>Ihre Gesundheitsdaten werden nur mit Ihrer ausdrücklichen Einwilligung verarbeitet. 
          Diese können Sie jederzeit widerrufen.</em>
        </p>
      </section>

      <section>
        <h2>6. Cookies</h2>
        <p>Wir verwenden folgende Cookies:</p>
        
        <h3>Essenzielle Cookies (immer aktiv)</h3>
        <ul>
          <li><strong>auth-token:</strong> Authentifizierung und Session-Management</li>
          <li><strong>refresh-token:</strong> Token-Aktualisierung</li>
          <li><strong>csrf-token:</strong> CSRF-Schutz</li>
          <li><strong>analytics-consent:</strong> Speichert Ihre Cookie-Einwilligung</li>
        </ul>
        
        <h3>Analyse-Cookies (nur mit Consent)</h3>
        <p>
          Analyse-Cookies werden erst nach Ihrer ausdrücklichen Zustimmung gesetzt. 
          Sie können Ihre Cookie-Präferenzen jederzeit in den Account-Einstellungen ändern.
        </p>
      </section>

      <section>
        <h2>7. Weitergabe an Dritte</h2>
        <p>Ihre Daten werden an folgende Auftragsverarbeiter weitergegeben 
           (gemäß Art. 28 DSGVO, streng an unsere Weisungen gebunden):</p>
        
        <ul>
          <li>
            <strong>Supabase Inc. (USA):</strong> Datenbank- und Authentifizierungs-Infrastruktur<br />
            <span className="text-sm text-muted-foreground">
              <a href="https://supabase.com/privacy" className="underline">Supabase Privacy Policy</a>
            </span>
          </li>
          <li>
            <strong>Vercel Inc. (USA):</strong> Hosting und Deployment<br />
            <span className="text-sm text-muted-foreground">
              <a href="https://vercel.com/legal/privacy-policy" className="underline">Vercel Privacy Policy</a>
            </span>
          </li>
        </ul>
        
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 my-4">
          <p className="text-sm">
            <strong>⚠️ Drittlandtransfer — USA:</strong> Supabase und Vercel haben Rechenzentren 
            in den USA. Ihre Daten unterliegen damit einem Drittlandtransfer außerhalb des EWR. 
            Bitte beachten Sie die Hinweise unter Abschnitt 11.
          </p>
        </div>
        
        <p>
          Ihre Daten werden <strong>nicht verkauft oder vermietet</strong>. Eine Weitergabe erfolgt 
          nur bei gesetzlicher Verpflichtung oder zur Wahrung unserer Rechte.
        </p>
      </section>

      <section>
        <h2>8. Drittlandtransfers</h2>
        <p>
          Unsere Infrastruktur (Supabase und Vercel) verarbeitet Daten teilweise in den 
          <strong> Vereinigten Staaten von Amerika (USA)</strong>.
        </p>
        <p>
          Rechtsgrundlage für diese Transfers kann sein:
        </p>
        <ul>
          <li>Das EU-US Data Privacy Framework (seit 2023)</li>
          <li>Standardvertragsklauseln (SCCs)</li>
          <li>Ihre ausdrückliche Einwilligung</li>
        </ul>
        <p>
          Sie haben das Recht, Auskunft über die spezifischen Garantien zu verlangen 
          (Art. 13(1)(f), 46 DSGVO).
        </p>
      </section>

      <section>
        <h2>9. Speicherdauer</h2>
        <ul>
          <li><strong>Account-Daten:</strong> Bis zur Account-Löschung</li>
          <li><strong>Sammlungs- und Bewertungsdaten:</strong> Bis zur Account-Löschung</li>
          <li><strong>Technische Logs:</strong> max. 90 Tage</li>
          <li><strong>Falls buchhaltungsrelevant:</strong> 10 Jahre (steuerliche Pflichten)</li>
        </ul>
        
        <h3>Nach Account-Löschung</h3>
        <ol>
          <li><strong>Sofort:</strong> Session-Tokens werden invalidiiert</li>
          <li><strong>Innerhalb von 30 Tagen:</strong> Alle personenbezogenen Daten werden gelöscht</li>
          <li><strong>Ausnahme:</strong> Gesetzliche Aufbewahrungspflichten (§ 147 AO)</li>
        </ol>
      </section>

      <section>
        <h2>10. Ihre Rechte</h2>
        <p>Sie haben das Recht auf:</p>
        
        <ul>
          <li>
            <strong>Auskunft (Art. 15 DSGVO):</strong> Welche Daten wir über Sie verarbeiten
          </li>
          <li>
            <strong>Berichtigung (Art. 16 DSGVO):</strong> Unrichtige Daten korrigieren
          </li>
          <li>
            <strong>Löschung &ldquo;Recht auf Vergessenwerden&ldquo; (Art. 17 DSGVO):</strong> 
            Vollständige Datenlöschung
          </li>
          <li>
            <strong>Einschränkung der Verarbeitung (Art. 18 DSGVO)</strong>
          </li>
          <li>
            <strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Export als JSON
          </li>
          <li>
            <strong>Widerspruch (Art. 21 DSGVO):</strong> Gegen berechtigtes Interesse
          </li>
          <li>
            <strong>Widerruf der Einwilligung (Art. 7 Abs. 3):</strong> Jederzeit möglich
          </li>
        </ul>
        
        <p>
          <strong>So üben Sie Ihre Rechte aus:</strong><br />
          E-Mail: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
        </p>
        <p className="text-sm text-muted-foreground">
          Wir werden Ihre Anfrage innerhalb von 30 Tagen beantworten. 
          Bei komplexen Anfragen kann diese Frist auf 90 Tage verlängert werden.
        </p>
      </section>

      <section>
        <h2>11. Sicherheit (Art. 32 DSGVO)</h2>
        <p>Wir implementieren angemessene technische und organisatorische Maßnahmen:</p>
        <ul>
          <li><strong>Verschlüsselung in Transit:</strong> TLS 1.2/1.3 für alle Verbindungen</li>
          <li><strong>Verschlüsselung at Rest:</strong> Supabase mit AES-256</li>
          <li><strong>Passwort-Hashing:</strong> bcrypt — niemals Klartext</li>
          <li><strong>Zugriffskontrolle:</strong> Rollenbasiert mit RLS in der Datenbank</li>
          <li><strong>Backup:</strong> Automatische Backups</li>
        </ul>
      </section>

      <section>
        <h2>12. Automatisierte Entscheidungsfindung</h2>
        <p>
          Es findet <strong>keine automatisierte Entscheidungsfindung</strong> im Sinne von 
          Art. 22 DSGVO statt, die rechtliche Wirkung entfaltet.
        </p>
        <p>
          Das Badge-System vergibt Badges automatisch basierend auf Ihrer Aktivität — 
          dies hat jedoch <strong>keine rechtlichen Auswirkungen</strong> auf Sie.
        </p>
      </section>

      <section>
        <h2>13. Beschwerde bei einer Aufsichtsbehörde</h2>
        <p>
          Wenn Sie der Meinung sind, dass wir gegen datenschutzrechtliche Vorschriften verstoßen, 
          haben Sie das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren.
        </p>
        
        <h3>Zuständige Aufsichtsbehörde:</h3>
        <p>
          <strong>Landesbeauftragte für den Datenschutz Niedersachsen</strong><br />
          Prinzenstraße 5<br />
          30159 Hannover<br />
          Telefon: +49 511 120-4500<br />
          E-Mail: inbox@lfd.niedersachsen.de
        </p>
        
        <p className="text-sm text-muted-foreground">
          Sie können sich auch an die Aufsichtsbehörde Ihres Wohnsitzlandes wenden.
        </p>
      </section>

      <section>
        <h2>14. Änderungen dieser Datenschutzerklärung</h2>
        <p>
          Bei wesentlichen Änderungen werden wir Sie per E-Mail informieren. 
          Die aktuelle Version ist immer auf dieser Seite abrufbar.
        </p>
      </section>

      <div className="text-sm text-muted-foreground border-t pt-4">
        <p>
          <em>
            Diese Datenschutzerklärung wurde sorgfältig erstellt, ersetzt aber keine 
            rechtliche Beratung. Für verbindliche Auskünfte wenden Sie sich bitte an einen 
            Datenschutzbeauftragten oder Rechtsanwalt.
          </em>
        </p>
      </div>
    </div>
  )
}
