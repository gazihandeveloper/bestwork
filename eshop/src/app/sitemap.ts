import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://mahmutgazihanarslan.com.tr'
  const now = new Date()
  const paths = ['', '/products', '/about', '/contact', '/login', '/register']
  return paths.map((p) => ({
    url: base + (p || ''),
    lastModified: now,
    changeFrequency: 'daily',
    priority: p === '' ? 1.0 : 0.7,
  }))
}
