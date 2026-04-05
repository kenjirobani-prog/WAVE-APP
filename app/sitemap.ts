import { MetadataRoute } from 'next'
import { howtoArticles } from '@/data/howto'
import { SPOTS } from '@/data/spots'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastMod = new Date('2026-04-05')

  const howtoEntries: MetadataRoute.Sitemap = howtoArticles.map(article => ({
    url: `https://jpwaveforecast.com/howto/${article.slug}`,
    lastModified: lastMod,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const spotEntries: MetadataRoute.Sitemap = SPOTS
    .filter(s => s.isActive)
    .map(spot => ({
      url: `https://jpwaveforecast.com/spot/${spot.id}`,
      lastModified: lastMod,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

  return [
    // TOP（湘南）
    {
      url: 'https://jpwaveforecast.com',
      lastModified: lastMod,
      changeFrequency: 'daily',
      priority: 1,
    },
    // エリアページ
    {
      url: 'https://jpwaveforecast.com/chiba-north',
      lastModified: lastMod,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://jpwaveforecast.com/chiba-south',
      lastModified: lastMod,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://jpwaveforecast.com/ibaraki',
      lastModified: lastMod,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // 全スポット（20件）
    ...spotEntries,
    // FAQ
    {
      url: 'https://jpwaveforecast.com/faq',
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // 用語集
    {
      url: 'https://jpwaveforecast.com/glossary',
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // How-to記事
    ...howtoEntries,
    // サーフボード
    {
      url: 'https://jpwaveforecast.com/surfboards',
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]
}
