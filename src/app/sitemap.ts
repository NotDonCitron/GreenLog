import { MetadataRoute } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabaseClient()

  // Fetch all strain slugs from Supabase
  const { data: strains, error } = await supabase
    .from('strains')
    .select('slug, created_at')
    .limit(1000)

  const strainUrls = (strains || []).map((strain) => ({
    url: `https://greenlog.app/strains/${strain.slug}`,
    lastModified: new Date(strain.created_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://greenlog.app/',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://greenlog.app/strains',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://greenlog.app/collection',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://greenlog.app/community',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://greenlog.app/discover',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://greenlog.app/feed',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: 'https://greenlog.app/profile',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/scanner',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/impressum',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/datenschutz',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/agb',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/en/impressum',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/en/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/en/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  return [...staticPages, ...strainUrls]
}