import type { Metadata } from 'next'
import CommunityPageClient from './CommunityPageClient'

export const metadata: Metadata = {
  title: 'Community',
  description: 'Entdecke Cannabis Communities, Clubs und Apotheken auf GreenLog.',
  openGraph: {
    title: 'Community | GreenLog',
    description: 'Entdecke Cannabis Communities, Clubs und Apotheken auf GreenLog.',
    images: [{ url: '/api/og' }],
  },
}

export default function CommunityPage() {
  return <CommunityPageClient />
}
