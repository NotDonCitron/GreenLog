import { createServerSupabaseClient } from '@/lib/supabase/server'
import StrainDetailPageClient from './StrainDetailPageClient'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()

  const { data: strain } = await supabase
    .from('strains')
    .select('name, description, breeder, thc_max, thc_level, farmer, manufacturer, brand')
    .eq('slug', params.slug)
    .single()

  if (!strain) {
    return { title: 'Strain nicht gefunden | GreenLog' }
  }

  const breeder = strain.breeder || strain.farmer || strain.manufacturer || strain.brand || 'Unbekannter Breeder'
  const thcDisplay = strain.thc_max || strain.thc_level || null

  return {
    title: strain.name,
    description: `${strain.name} — ${breeder}. THC: ${thcDisplay ? `${thcDisplay}%` : 'N/A'}. Finde Reviews, Ratings und Info auf GreenLog.`,
    openGraph: {
      title: strain.name,
      description: strain.description || `Strain ${strain.name} auf GreenLog`,
      images: [{ url: '/api/og' }],
    },
  }
}

export default async function StrainDetailPage() {
  return <StrainDetailPageClient />
}
