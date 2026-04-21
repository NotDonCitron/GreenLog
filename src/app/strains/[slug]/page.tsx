import { createServerSupabaseClient } from '@/lib/supabase/server'
import StrainDetailPageClient from './StrainDetailPageClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: strain, error } = await supabase
    .from('strains')
    .select('name, description, thc_max, farmer')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .single()

  if (error) {
    console.warn(`[strains/${slug}] metadata query failed:`, error.message)
  }

  if (!strain) {
    return { title: 'Strain nicht gefunden | CannaLog' }
  }

  const breeder = strain.farmer || 'Unbekannter Breeder'
  const thcDisplay = strain.thc_max || null

  return {
    title: strain.name,
    description: `${strain.name} — ${breeder}. THC: ${thcDisplay ? `${thcDisplay}%` : 'N/A'}. Finde Reviews, Ratings und Info auf CannaLog.`,
    openGraph: {
      title: strain.name,
      description: strain.description || `Strain ${strain.name} auf CannaLog`,
      images: [{ url: '/api/og' }],
    },
  }
}

export default async function StrainDetailPage() {
  return <StrainDetailPageClient />
}
