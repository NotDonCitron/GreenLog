import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum of GreenLog — Cannabis Strain Tracking & Collection',
}

export default function ImpressumEnPage() {
  return (
    <div className="space-y-6">
      <h1>Impressum (Legal Notice)</h1>

      <section>
        <h2>Information according to § 5 TMG (German Telemedia Act)</h2>
        <p>
          CannaLog (project operation)<br />
          c/o CannaLog Project Office<br />
          Berlin<br />
          Germany
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Email: <a href="mailto:cannalog.official@gmail.com">cannalog.official@gmail.com</a>
        </p>
      </section>
    </div>
  )
}
