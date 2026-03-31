import type { Metadata } from 'next'
import { Suspense } from 'react'
import CollectionPageClient from './CollectionPageClient'

export const metadata: Metadata = {
  title: 'Meine Sammlung',
  description: 'Deine persönliche Strain-Sammlung auf CannaLog.',
  openGraph: {
    title: 'Meine Sammlung | CannaLog',
    description: 'Deine persönliche Strain-Sammlung auf CannaLog.',
    images: [{ url: '/api/og' }],
  },
}

export default function CollectionPage() {
  return (
    <Suspense fallback={null}>
      <CollectionPageClient />
    </Suspense>
  )
}
