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
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Input
          type="email"
          placeholder="deine@email.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading' || status === 'success'}
          className="h-12 w-full rounded-xl border-[#00F5FF]/30 bg-[var(--background)]/50 backdrop-blur-sm pr-24"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 px-4 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] hover:bg-[#00F5FF]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
            status === 'error' ? 'text-red-500' : 'text-green-500'
          }`}
        >
          {message}
        </p>
      )}

      <p className="text-[10px] text-center text-[var(--muted-foreground)] mt-4">
        Mit dem Absenden stimmst du unserer Datenschutzerklärung zu.
      </p>
    </div>
  )
}