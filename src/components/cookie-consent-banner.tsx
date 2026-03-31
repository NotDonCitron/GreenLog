'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'cookie_consent'

type ConsentLevel = 'all' | 'essential' | null

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentLevel>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check localStorage on mount
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentLevel
    if (stored === 'all' || stored === 'essential') {
      setConsent(stored)
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all')
    setConsent('all')
    setIsVisible(false)
  }

  const handleEssentialOnly = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential')
    setConsent('essential')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '16px 24px',
        backgroundColor: 'var(--card)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '300px' }}>
          <p style={{ fontSize: '14px', color: 'var(--foreground)', margin: 0 }}>
            Wir verwenden Cookies, um deine Erfahrung zu verbessern.{' '}
            <a
              href="/datenschutz"
              style={{ color: 'var(--primary)', textDecoration: 'underline' }}
            >
              Mehr erfahren
            </a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleEssentialOnly}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Nur essenzielle
          </button>
          <button
            onClick={handleAcceptAll}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  )
}