import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://baytup.fr';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamic listing pages
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/listings?status=active&limit=1000`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (res.ok) {
      const data = await res.json();
      const listings = data.data?.listings || [];

      listingPages = listings.map((listing: any) => ({
        url: `${SITE_URL}/listing/${listing._id}`,
        lastModified: new Date(listing.updatedAt || listing.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('[Sitemap] Error fetching listings:', error);
  }

  return [...staticPages, ...listingPages];
}
