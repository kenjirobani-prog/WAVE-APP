import { MetadataRoute } from 'next'
import { howtoArticles } from '@/data/howto'

export default function sitemap(): MetadataRoute.Sitemap {
  const howtoEntries: MetadataRoute.Sitemap = howtoArticles.map(article => ({
    url: `https://jpwaveforecast.com/howto/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    {
      url: 'https://jpwaveforecast.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://jpwaveforecast.com/spot/kugenuma',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://jpwaveforecast.com/spot/tsujido',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://jpwaveforecast.com/spot/chigasaki',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://jpwaveforecast.com/spot/oiso',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://jpwaveforecast.com/spot/shichiri',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://jpwaveforecast.com/spot/yuigahama',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://jpwaveforecast.com/spot/aquarium',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://jpwaveforecast.com/faq',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...howtoEntries,
  ]
}
