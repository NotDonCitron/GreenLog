import type { Metadata } from 'next'
import CommunityPageClient from './CommunityPageClient'

export const metadata: Metadata = {
  title: 'Community',
  description: 'Entdecke Cannabis Communities, Clubs und Apotheken auf CannaLog.',
  openGraph: {
    title: 'Community | CannaLog',
    description: 'Entdecke Cannabis Communities, Clubs und Apotheken auf CannaLog.',
    images: [{ url: '/api/og' }],
  },
}

export default function CommunityPage() {
  return <CommunityPageClient />
}
