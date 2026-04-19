import type { Metadata } from 'next'
import CommunityPageClient from './CommunityPageClient'

export const metadata: Metadata = {
  title: 'Community',
  description: 'Verwalte organisatorische Profile und Aktivitätsdaten auf CannaLog.',
  openGraph: {
    title: 'Community | CannaLog',
    description: 'Verwalte organisatorische Profile und Aktivitätsdaten auf CannaLog.',
    images: [{ url: '/api/og' }],
  },
}

export default function CommunityPage() {
  return <CommunityPageClient />
}
