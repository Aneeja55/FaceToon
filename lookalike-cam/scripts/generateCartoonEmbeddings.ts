// scripts/generateCartoonEmbeddings.mts
import * as faceapi from 'face-api.js';
import * as path from 'path';
import * as canvas from 'canvas';
import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';
import { writeFile } from 'fs/promises';

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patch for Node.js environment
const { Canvas, Image, loadImage } = canvas;
faceapi.env.monkeyPatch({
  Canvas: Canvas as unknown as typeof HTMLCanvasElement,
  Image: Image as unknown as typeof HTMLImageElement,
  ImageData: globalThis.ImageData || (canvas as unknown as { ImageData: typeof ImageData }).ImageData,
  createCanvasElement: () => canvas.createCanvas(1, 1) as unknown as HTMLCanvasElement,
  createImageElement: () => new Image() as unknown as HTMLImageElement,
});

// Paths
const MODEL_PATH = path.join(__dirname, '..', 'public', 'models');
const IMAGE_DIR = path.join(__dirname, '..', 'public', 'cartoon_characters');
const OUTPUT_PATH = path.join(__dirname, '..', 'src/lib', 'cartoonEmbeddings.json');

// Load face-api.js models
const loadModels = async () => {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
};

// Get face embedding from an image
const getFaceEmbedding = async (imgPath: string): Promise<Float32Array | null> => {
  const img = await loadImage(imgPath);
  const c = canvas.createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);

  const detection = await faceapi
    .detectSingleFace(c as unknown as faceapi.TNetInput)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor || null;
};

// Run the embedding generation process
const run = async () => {
  await loadModels();
  const files = await readdir(IMAGE_DIR);
  const embeddings: Record<string, number[]> = {};

  for (const file of files) {
    const filePath = path.join(IMAGE_DIR, file);
    const descriptor = await getFaceEmbedding(filePath);
    if (descriptor) {
      embeddings[file] = Array.from(descriptor);
      console.log(`✅ Processed: ${file}`);
    } else {
      console.warn(`⚠️  No face detected in ${file}`);
    }
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(embeddings, null, 2));
  console.log('✅ Embeddings saved to cartoon_embeddings.json');
};

run();
