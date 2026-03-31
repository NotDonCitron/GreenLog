import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service of GreenLog',
}

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <h1>Terms of Service</h1>
      <p><strong>Last updated:</strong> March 31, 2026</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By registering and using GreenLog, you accept these Terms of Service.
          If you do not agree to these terms, please do not use our platform.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          GreenLog provides a platform for managing cannabis strains, collections,
          and community features. Basic functions are free to use.
        </p>
      </section>

      <section>
        <h2>3. Registration and Account</h2>
        <p>
          Registration requires a valid email address. You are responsible for
          keeping your login credentials confidential and for all activities under your account.
        </p>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Submit false or misleading strain ratings</li>
          <li>Publish content that violates applicable law</li>
          <li>Violate the privacy of other users</li>
          <li>Misuse the platform in any way</li>
        </ul>
      </section>

      <section>
        <h2>5. Disclaimer</h2>
        <p>
          GreenLog makes no warranty about the accuracy, completeness, or timeliness
          of strain information provided. The platform does not replace professional advice.
        </p>
      </section>

      <section>
        <h2>6. Intellectual Property</h2>
        <p>
          The GreenLog platform and its content are protected by copyright.
          Reproduction or reuse requires prior written consent.
        </p>
      </section>

      <section>
        <h2>7. Changes to Terms</h2>
        <p>
          We reserve the right to change these Terms of Service at any time.
          You will be notified by email about significant changes.
          The current version is always available here.
        </p>
      </section>
    </div>
  )
}