// lookalike-cam/pages/api/cartoon-search.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q = "cartoon face" } = req.query;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&generator=search&gsrsearch=${encodeURIComponent(q as string)}&gsrlimit=30&iiprop=url`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch images" });
    }
    const data = await response.json();
    // Parse Wikimedia response
    const images: string[] = [];
    if (data.query && data.query.pages) {
      for (const page of Object.values(data.query.pages) as { imageinfo?: { url?: string }[] }[]) {
        if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
          images.push(page.imageinfo[0].url);
        }
      }
    }
    res.status(200).json({ results: images });
  } catch (e) {
    res.status(500).json({ error: "Proxy error" });
  }
}
