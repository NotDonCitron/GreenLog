import { MetadataRoute } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PUBLIC_SITE_URL } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabaseClient()

  // Fetch all strain slugs from Supabase
  const { data: strains, error } = await supabase
    .from('strains')
    .select('slug, created_at')
    .eq('publication_status', 'published')
    .limit(1000)

  const strainUrls = (strains || []).map((strain) => ({
    url: `${PUBLIC_SITE_URL}/strains/${strain.slug}`,
    lastModified: new Date(strain.created_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${PUBLIC_SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${PUBLIC_SITE_URL}/strains`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${PUBLIC_SITE_URL}/collection`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${PUBLIC_SITE_URL}/community`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${PUBLIC_SITE_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${PUBLIC_SITE_URL}/feed`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${PUBLIC_SITE_URL}/profile`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${PUBLIC_SITE_URL}/scanner`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${PUBLIC_SITE_URL}/impressum`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${PUBLIC_SITE_URL}/datenschutz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${PUBLIC_SITE_URL}/agb`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${PUBLIC_SITE_URL}/en/impressum`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${PUBLIC_SITE_URL}/en/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${PUBLIC_SITE_URL}/en/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  return [...staticPages, ...strainUrls]
}
