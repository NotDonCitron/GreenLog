'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'cookie_consent'

type ConsentLevel = 'all' | 'essential' | null

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentLevel>(null)
  const [isVisible, setIsVisible] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentLevel
      if (stored === 'all' || stored === 'essential') {
        setTimeout(() => { setConsent(stored); setIsVisible(false); }, 0)
      } else {
        setTimeout(() => setIsVisible(true), 0)
      }
    } catch {
      setTimeout(() => setIsVisible(true), 0)
    }
  }, [])

  useEffect(() => {
    if (isVisible && bannerRef.current) {
      bannerRef.current.focus()
    }
  }, [isVisible])

  const handleAcceptAll = () => {
    try { try { localStorage.setItem(COOKIE_CONSENT_KEY, 'all') } catch { console.warn('Cookie consent storage failed') } } catch { console.warn('Cookie consent storage failed') }
    setConsent('all')
    setIsVisible(false)
  }

  const handleEssentialOnly = () => {
    try { try { localStorage.setItem(COOKIE_CONSENT_KEY, 'essential') } catch { console.warn('Cookie consent storage failed') } } catch { console.warn('Cookie consent storage failed') }
    setConsent('essential')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      aria-describedby="cookie-consent-text"
      tabIndex={-1}
      className="fixed bottom-16 left-0 right-0 z-40 bg-[var(--card)] border-t border-[var(--border)] shadow-lg p-4 sm:p-6"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p id="cookie-consent-text" className="text-sm text-[var(--foreground)]">
            Wir verwenden Cookies, um deine Erfahrung zu verbessern.{' '}
            <a
              href="/datenschutz"
              className="text-[var(--primary)] underline hover:no-underline"
            >
              Mehr erfahren
            </a>
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={handleEssentialOnly}
            className="px-4 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--foreground)] text-sm font-medium hover:bg-[var(--accent)] transition-colors"
          >
            Nur essenzielle
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 rounded-lg border-none bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Alle akzeptieren
          </button>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Dismiss cookie banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
