import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), {
      status: 400,
    });
  }

  // === MOCK FACE MATCH ===
  const cartoonDir = path.join(process.cwd(), "public/cartoon_characters");
  const cartoonFiles = fs.readdirSync(cartoonDir);
  const randomFile = cartoonFiles[Math.floor(Math.random() * cartoonFiles.length)];
  const imageBuffer = fs.readFileSync(path.join(cartoonDir, randomFile));
  const base64 = imageBuffer.toString("base64");

  return new Response(
    JSON.stringify({
      matchedImage: `data:image/jpeg;base64,${base64}`,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
