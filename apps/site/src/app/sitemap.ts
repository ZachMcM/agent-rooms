import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site'
import { source } from '@/lib/source'

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    url: new URL(page.url, siteUrl).toString(),
    changeFrequency: 'weekly' as const,
    priority: page.url === '/docs' ? 0.8 : 0.7,
  }))

  return [
    {
      url: new URL('/', siteUrl).toString(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...docs,
  ]
}
