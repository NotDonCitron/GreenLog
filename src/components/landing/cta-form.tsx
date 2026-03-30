'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, Check } from 'lucide-react'

export function CTAForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.includes('@')) {
      setStatus('error')
      setMessage('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }

    setStatus('loading')
    setMessage('')

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setStatus('success')
    setMessage('Danke! Wir melden uns bald bei dir.')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Input
          type="email"
          placeholder="deine@email.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading' || status === 'success'}
          className="h-12 w-full rounded-xl border-2 border-white/30 bg-white/10 text-white placeholder:text-white/50 pr-28"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 px-4 rounded-lg bg-white text-green-600 font-bold hover:bg-green-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            'Demo anfragen'
          )}
        </button>
      </form>

      {message && (
        <p
          className={`mt-2 text-sm ${
            status === 'error' ? 'text-red-200' : 'text-green-100'
          }`}
        >
          {message}
        </p>
      )}

      <p className="text-xs text-center text-green-100 mt-4">
        Mit dem Absenden stimmst du unserer Datenschutzerklärung zu.
      </p>
    </div>
  )
}
