import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy of GreenLog — Cannabis Strain Tracking & Collection',
}

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> March 31, 2026</p>

      <section>
        <h2>1. Controller</h2>
        <p>
          GreenLog<br />
          Email: <a href="mailto:privacy@greenlog.app">privacy@greenlog.app</a>
        </p>
      </section>

      <section>
        <h2>2. Data We Collect</h2>
        <p>We collect and process the following personal data:</p>
        <ul>
          <li><strong>Account data:</strong> Email address, password (encrypted)</li>
          <li><strong>Profile data:</strong> Username, bio, profile picture</li>
          <li><strong>Strain data:</strong> Ratings, favorites, collection notes</li>
          <li><strong>Activity data:</strong> Follows, community posts, badge progress</li>
        </ul>
      </section>

      <section>
        <h2>3. Purpose of Processing</h2>
        <p>Your data is used for:</p>
        <ul>
          <li>Providing the GreenLog service</li>
          <li>Managing your account</li>
          <li>Storing your strain collection and ratings</li>
          <li>Social features (Followers, Community)</li>
          <li>Badge system and gamification</li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies</h2>
        <p>We use the following cookie categories:</p>
        <ul>
          <li><strong>Essential cookies:</strong> Required for service functionality (authentication, session)</li>
          <li><strong>Analytics cookies:</strong> Set only after your consent</li>
        </ul>
      </section>

      <section>
        <h2>5. International Transfers</h2>
        <p>
          Your data may be transferred to and processed in countries outside the European Economic Area.
          Such transfers are conducted in accordance with GDPR requirements.
        </p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your stored data (Art. 15 GDPR)</li>
          <li>Rectify inaccurate data (Art. 16 GDPR)</li>
          <li>Request erasure ("Right to be Forgotten") (Art. 17 GDPR)</li>
          <li>Restrict processing (Art. 18 GDPR)</li>
          <li>Data portability (Art. 20 GDPR)</li>
          <li>Object to processing (Art. 21 GDPR)</li>
        </ul>
        <p>To exercise your rights, contact us at: <a href="mailto:privacy@greenlog.app">privacy@greenlog.app</a></p>
      </section>
    </div>
  )
}