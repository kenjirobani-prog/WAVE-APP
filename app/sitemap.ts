import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
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
  ]
}
