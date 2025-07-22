// pages/api/match.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import * as faceapi from 'face-api.js'
import { Canvas, Image, ImageData, loadImage } from 'canvas'

// 1️⃣ Patch face-api.js for Node + canvas
faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
  createCanvasElement: () => new Canvas(1, 1) as any,
  createImageElement: () => new Image() as any
})

// 2️⃣ Disable bodyParser so we can use formidable
export const config = { api: { bodyParser: false } }

// 3️⃣ Load models once (or you can memoize)
const MODEL_PATH = path.join(process.cwd(), 'public', 'models')
let modelsLoaded = false
async function ensureModels() {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH),
    faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
    faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
  ])
  modelsLoaded = true
}

// 4️⃣ Cosine distance
function cosineDistance(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return 1 - dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Only POST allowed' })

  // parse multipart with formidable
  const form = new formidable.IncomingForm()
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload failed' })
    const file = files.file as formidable.File
    if (!file || Array.isArray(file))
      return res.status(400).json({ error: 'No file uploaded' })

    await ensureModels()

    // load image from the temp filepath
    const img = await loadImage(file.filepath)
    const c = new Canvas(img.width, img.height)
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const detection = await faceapi
      .detectSingleFace(c as any)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection)
      return res.status(400).json({ error: 'No face detected' })

    const uploadedDescriptor = Array.from(detection.descriptor)

    // load your precomputed embeddings
    const json = fs.readFileSync(
      path.join(process.cwd(), 'public', 'cartoon_embeddings.json'),
      'utf8'
    )
    const embeddings: Record<string, number[]> = JSON.parse(json)

    let bestName: string | null = null
    let bestDist = Infinity
    for (const [name, desc] of Object.entries(embeddings)) {
      const dist = cosineDistance(uploadedDescriptor, desc)
      if (dist < bestDist) {
        bestDist = dist
        bestName = name
      }
    }

    if (!bestName)
      return res.status(500).json({ error: 'Matching failed' })

    // return the relative URL where your public/cartooncharacters live
    const matchedUrl = `/cartooncharacters/${bestName}`

    return res.status(200).json({ matchedUrl })
  })
}
