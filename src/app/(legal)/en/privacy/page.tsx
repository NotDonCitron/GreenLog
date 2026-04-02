import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy of GreenLog — Medical Cannabis Journal & Strain Tracker',
}

export default function PrivacyPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1>Privacy Policy</h1>
        <p><strong>Last updated:</strong> April 2026 — Version 1.0</p>
      </div>

      <section>
        <h2>1. Controller</h2>
        <p>
          <strong>GreenLog</strong><br />
          Email: <a href="mailto:privacy@greenlog.app">privacy@greenlog.app</a><br />
          Website: <a href="https://greenlog.app">https://greenlog.app</a>
        </p>
      </section>

      <section>
        <h2>2. Data Protection Officer</h2>
        <p>
          For questions regarding data protection, contact us at:{' '}
          <a href="mailto:privacy@greenlog.app">privacy@greenlog.app</a>
        </p>
      </section>

      <section>
        <h2>3. Data We Collect</h2>
        
        <h3>3.1 Account Data</h3>
        <ul>
          <li>Email address (required)</li>
          <li>Password (encrypted, never plaintext)</li>
          <li>Profile picture (optional)</li>
        </ul>
        
        <h3>3.2 Collection & Rating Data</h3>
        <ul>
          <li>Strain ratings (1-5 stars)</li>
          <li>Personal notes on strains</li>
          <li>Photo uploads (self-taken images)</li>
          <li>Batch information (pharmacy, purchase date, batch number)</li>
          <li>THC/CBD values (if provided by you)</li>
        </ul>
        
        <h3>3.3 Grow Tracker Data</h3>
        <ul>
          <li>Grow entries (date, plant type, growth stage)</li>
          <li>Cultivation notes</li>
          <li>Environment data (temperature, humidity)</li>
          <li>Plant photos</li>
        </ul>
        
        <h3>3.4 Activity Data</h3>
        <ul>
          <li>Follows (who you follow / who follows you)</li>
          <li>Community posts</li>
          <li>Badge progress and earned badges</li>
          <li>XP level and statistics</li>
        </ul>
        
        <h3>3.5 Technical Data</h3>
        <ul>
          <li>IP address (at registration and login)</li>
          <li>Browser type and device information</li>
          <li>Access timestamps</li>
        </ul>
      </section>

      <section>
        <h2>4. Special Categories — Health Data (Art. 9 GDPR)</h2>
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 my-4">
          <p className="text-sm">
            <strong>⚠️ Important Notice:</strong> Since GreenLog is used for documenting 
            <strong> medical cannabis</strong>, we implicitly process <strong>health data</strong> 
            (e.g., medical indications in personal notes). This data falls under Art. 9(1) GDPR 
            and requires your <strong>explicit consent</strong>.
          </p>
        </div>
        <p>Examples of health data that may be processed:</p>
        <ul>
          <li>Medical indications in notes (&ldquo;helpful for pain&rdquo;)</li>
          <li>Therapy history through past strain ratings</li>
          <li>Self-diagnoses in personal notes</li>
        </ul>
      </section>

      <section>
        <h2>5. Purpose of Processing</h2>
        <p>Your data is used for:</p>
        <ul>
          <li>Providing the GreenLog service</li>
          <li>Managing your account</li>
          <li>Storing your strain collection and ratings</li>
          <li>Social features (Followers, Community)</li>
          <li>Badge system and gamification</li>
          <li>Communication with you</li>
          <li>Support and troubleshooting</li>
        </ul>
      </section>

      <section>
        <h2>6. Legal Basis</h2>
        
        <h3>6.1 General Personal Data (Art. 6 GDPR)</h3>
        <ul>
          <li><strong>Art. 6(1)(b) — Contract Performance:</strong> Service provision</li>
          <li><strong>Art. 6(1)(c) — Legal Obligation:</strong> Accounting, tax obligations</li>
          <li><strong>Art. 6(1)(f) — Legitimate Interest:</strong> Security, fraud prevention</li>
          <li><strong>Art. 6(1)(a) — Consent:</strong> Email marketing</li>
        </ul>
        
        <h3>6.2 Special Categories — Health Data (Art. 9 GDPR)</h3>
        <ul>
          <li>
            <strong>Art. 9(2)(a) — Explicit Consent:</strong> Processing of health data
          </li>
        </ul>
        <p>
          <em>Your health data is processed only with your explicit consent. 
          You may revoke this consent at any time.</em>
        </p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        
        <h3>Essential Cookies (always active)</h3>
        <ul>
          <li><strong>auth-token:</strong> Authentication and session management</li>
          <li><strong>refresh-token:</strong> Token refresh</li>
          <li><strong>csrf-token:</strong> CSRF protection</li>
          <li><strong>analytics-consent:</strong> Stores your cookie consent</li>
        </ul>
        
        <h3>Analytics Cookies (only with consent)</h3>
        <p>
          Analytics cookies are only set after your explicit consent. 
          You can change your cookie preferences in your account settings at any time.
        </p>
      </section>

      <section>
        <h2>8. Disclosure to Third Parties</h2>
        <p>Your data is shared with the following processors 
           (pursuant to Art. 28 GDPR, bound by our instructions):</p>
        
        <ul>
          <li>
            <strong>Supabase Inc. (USA):</strong> Database and authentication infrastructure<br />
            <span className="text-sm text-muted-foreground">
              <a href="https://supabase.com/privacy" className="underline">Supabase Privacy Policy</a>
            </span>
          </li>
          <li>
            <strong>Vercel Inc. (USA):</strong> Hosting and deployment<br />
            <span className="text-sm text-muted-foreground">
              <a href="https://vercel.com/legal/privacy-policy" className="underline">Vercel Privacy Policy</a>
            </span>
          </li>
        </ul>
        
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 my-4">
          <p className="text-sm">
            <strong>⚠️ Third Country Transfer — USA:</strong> Supabase and Vercel process data 
            in the United States. Your data is therefore subject to a third country transfer 
            outside the EEA. Please note the information under Section 11.
          </p>
        </div>
        
        <p>
          Your data is <strong>not sold or rented</strong>. Disclosure occurs only when 
          legally required or to protect our rights.
        </p>
      </section>

      <section>
        <h2>9. International Transfers</h2>
        <p>
          Our infrastructure (Supabase and Vercel) processes data partially in the 
          <strong> United States of America (USA)</strong>.
        </p>
        <p>
          Legal basis for these transfers may include:
        </p>
        <ul>
          <li>EU-US Data Privacy Framework (since 2023)</li>
          <li>Standard Contractual Clauses (SCCs)</li>
          <li>Your explicit consent</li>
        </ul>
        <p>
          You have the right to request information about the specific safeguards 
          (Art. 13(1)(f), 46 GDPR).
        </p>
      </section>

      <section>
        <h2>10. Retention Period</h2>
        <ul>
          <li><strong>Account data:</strong> Until account deletion</li>
          <li><strong>Collection and rating data:</strong> Until account deletion</li>
          <li><strong>Technical logs:</strong> max. 90 days</li>
          <li><strong>If relevant for accounting:</strong> 10 years (tax obligations)</li>
        </ul>
        
        <h3>After Account Deletion</h3>
        <ol>
          <li><strong>Immediately:</strong> Session tokens are invalidated</li>
          <li><strong>Within 30 days:</strong> All personal data is deleted</li>
          <li><strong>Exception:</strong> Legal retention obligations (§ 147 AO)</li>
        </ol>
      </section>

      <section>
        <h2>11. Your Rights</h2>
        <p>You have the right to:</p>
        
        <ul>
          <li>
            <strong>Access (Art. 15 GDPR):</strong> Which data we process about you
          </li>
          <li>
            <strong>Rectification (Art. 16 GDPR):</strong> Correct inaccurate data
          </li>
          <li>
            <strong>Erasure &ldquo;Right to be Forgotten&rdquo; (Art. 17 GDPR):</strong> 
            Complete data deletion
          </li>
          <li>
            <strong>Restriction of Processing (Art. 18 GDPR)</strong>
          </li>
          <li>
            <strong>Data Portability (Art. 20 GDPR):</strong> Export as JSON
          </li>
          <li>
            <strong>Object (Art. 21 GDPR):</strong> Against legitimate interest
          </li>
          <li>
            <strong>Withdraw Consent (Art. 7(3)):</strong> At any time
          </li>
        </ul>
        
        <p>
          <strong>To exercise your rights:</strong><br />
          Email: <a href="mailto:privacy@greenlog.app">privacy@greenlog.app</a>
        </p>
        <p className="text-sm text-muted-foreground">
          We will respond to your request within 30 days. For complex requests, 
          this period may be extended to 90 days.
        </p>
      </section>

      <section>
        <h2>12. Security (Art. 32 GDPR)</h2>
        <p>We implement appropriate technical and organizational measures:</p>
        <ul>
          <li><strong>Encryption in Transit:</strong> TLS 1.2/1.3 for all connections</li>
          <li><strong>Encryption at Rest:</strong> Supabase with AES-256</li>
          <li><strong>Password Hashing:</strong> bcrypt — never plaintext</li>
          <li><strong>Access Control:</strong> Role-based with RLS in database</li>
          <li><strong>Backup:</strong> Automatic backups</li>
        </ul>
      </section>

      <section>
        <h2>13. Automated Decision-Making</h2>
        <p>
          There is <strong>no automated decision-making</strong> within the meaning of 
          Art. 22 GDPR that has legal effects.
        </p>
        <p>
          The badge system automatically awards badges based on your activity — 
          however, this has <strong>no legal impact</strong> on you.
        </p>
      </section>

      <section>
        <h2>14. Complaint to a Supervisory Authority</h2>
        <p>
          If you believe that we are violating data protection regulations, 
          you have the right to lodge a complaint with a supervisory authority.
        </p>
        
        <h3>Competent Supervisory Authority:</h3>
        <p>
          <strong>Die Landesbeauftragte für den Datenschutz Niedersachsen</strong><br />
          (Data Protection Authority of Lower Saxony, Germany)<br />
          Prinzenstraße 5<br />
          30159 Hannover<br />
          Phone: +49 511 120-4500<br />
          Email: inbox@lfd.niedersachsen.de
        </p>
        
        <p className="text-sm text-muted-foreground">
          You may also contact the supervisory authority of your country of residence.
        </p>
      </section>

      <section>
        <h2>15. Changes to This Privacy Policy</h2>
        <p>
          For significant changes, we will notify you by email. 
          The current version is always available on this page.
        </p>
      </section>

      <div className="text-sm text-muted-foreground border-t pt-4">
        <p>
          <em>
            This privacy policy has been carefully prepared but does not constitute 
            legal advice. For binding information, please consult a data protection 
            officer or attorney.
          </em>
        </p>
      </div>
    </div>
  )
}
