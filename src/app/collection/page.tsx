import type { Metadata } from 'next'
import { Suspense } from 'react'
import CollectionPageClient from './CollectionPageClient'

export const metadata: Metadata = {
  title: 'Meine Sammlung',
  description: 'Deine persönliche Strain-Sammlung auf GreenLog.',
  openGraph: {
    title: 'Meine Sammlung | GreenLog',
    description: 'Deine persönliche Strain-Sammlung auf GreenLog.',
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
