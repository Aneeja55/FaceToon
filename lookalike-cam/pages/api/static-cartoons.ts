import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const dir = path.join(process.cwd(), 'public', 'cartoon_characters');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter(f =>
      f.match(/\.(jpg|jpeg|png|gif)$/i)
    );
  } catch (e) {
    return res.status(500).json({ error: 'Could not read cartoon_characters directory' });
  }
  res.status(200).json({ files });
} 