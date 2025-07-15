import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ storage: multer.memoryStorage() });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest & { file: Express.Multer.File },
  res: NextApiResponse
) {
  try {
    const cartoonDir = path.join(process.cwd(), "public/cartoon_characters");
    const files = fs.readdirSync(cartoonDir);
    const selected = files[Math.floor(Math.random() * files.length)];
    const imagePath = path.join(cartoonDir, selected);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
    res.status(200).json({ matchedImage: base64Image });
  } catch (error) {
    console.error("Error in match API:", error);
    res.status(500).json({ error: "Server error" });
  }
};

