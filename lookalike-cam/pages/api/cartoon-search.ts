// lookalike-cam/pages/api/cartoon-search.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q = "cartoon character" } = req.query;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&generator=search&gsrsearch=${encodeURIComponent(q as string)}&gsrlimit=30&iiprop=url`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch images" });
    }
    const data = await response.json();
    // Parse Wikimedia response
    const images = [];
    if (data.query && data.query.pages) {
      for (const page of Object.values(data.query.pages)) {
        // Explicitly type page as any to avoid 'unknown' type errors
        const typedPage = page as any;
        if (
          typedPage.imageinfo &&
          Array.isArray(typedPage.imageinfo) &&
          typedPage.imageinfo[0] &&
          typedPage.imageinfo[0].url
        ) {
          images.push(typedPage.imageinfo[0].url);
        }
      }
    }
    res.status(200).json({ results: images });
  } catch (e) {
    res.status(500).json({ error: "Proxy error" });
  }
}
