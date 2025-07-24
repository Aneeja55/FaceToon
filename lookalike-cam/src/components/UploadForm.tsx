"use client"

import { useState } from "react"

const FACE_API_MODELS = "/models";
const STATIC_CARTOONS = [
  "/cartoon_characters/elsa.jpeg",
  "/cartoon_characters/luffy.jpg",
  "/cartoon_characters/moana.jpg",
  "/cartoon_characters/pikachu.jpeg",
  "/cartoon_characters/spongebob.jpeg",
  "/cartoon_characters/doraemon.jpg",
  "/cartoon_characters/p1.jpg",
  "/cartoon_characters/p2.jpg",
  "/cartoon_characters/p3.jpg",
  "/cartoon_characters/p4.jpg",
  "/cartoon_characters/pic2.jpg",
  "/cartoon_characters/pic3.jpg"
];

async function loadFaceApi() {
  const faceapi = await import("face-api.js");
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODELS),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS),
  ]);
  return faceapi;
}

async function fetchCartoonImages(count = 12): Promise<string[]> {
  const queries = [
    "cartoon face",
    "cartoon character face",
    "animated character face",
    "anime face",
    "disney character face"
  ];
  let images: string[] = [];
  for (const q of queries) {
    try {
      const url = `/api/cartoon-search?q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        images = images.concat(data.results);
      }
      if (images.length >= count) break;
    } catch {}
  }
  return images.slice(0, count);
}

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [matched, setMatched] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cartoonImages, setCartoonImages] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setMatched(null);
    setError(null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Select an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setMatched(null);
    setCartoonImages([]);

    try {
      const faceapi = await loadFaceApi();
      // 1. Fetch cartoon images from API
      let cartoonUrls = await fetchCartoonImages();
      setCartoonImages(cartoonUrls);
      // 2. Compute embedding for uploaded photo
      const userImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      const userDetection = await faceapi
        .detectSingleFace(userImg)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!userDetection) throw new Error("No face detected in uploaded photo.");
      const userEmbedding = userDetection.descriptor;
      // 3. For each cartoon image, compute embedding and compare
      let bestMatch = null;
      let bestDist = Infinity;
      let foundFace = false;
      for (const cartoonUrl of cartoonUrls) {
        try {
          const cartoonImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.src = cartoonUrl;
            img.onload = () => resolve(img);
            img.onerror = reject;
          });
          const cartoonDetection = await faceapi
            .detectSingleFace(cartoonImg)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (!cartoonDetection) continue;
          foundFace = true;
          const cartoonEmbedding = cartoonDetection.descriptor;
          let dot = 0, magA = 0, magB = 0;
          for (let i = 0; i < userEmbedding.length; i++) {
            dot += userEmbedding[i] * cartoonEmbedding[i];
            magA += userEmbedding[i] * userEmbedding[i];
            magB += cartoonEmbedding[i] * cartoonEmbedding[i];
          }
          const dist = 1 - dot / (Math.sqrt(magA) * Math.sqrt(magB));
          if (dist < bestDist) {
            bestDist = dist;
            bestMatch = cartoonUrl;
          }
        } catch {}
      }
      // 4. Fallback to static images if no faces found in API images
      if (!foundFace) {
        setCartoonImages(STATIC_CARTOONS);
        for (const cartoonUrl of STATIC_CARTOONS) {
          try {
            const cartoonImg = await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new window.Image();
              img.src = cartoonUrl;
              img.onload = () => resolve(img);
              img.onerror = reject;
            });
            const cartoonDetection = await faceapi
              .detectSingleFace(cartoonImg)
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (!cartoonDetection) continue;
            const cartoonEmbedding = cartoonDetection.descriptor;
            let dot = 0, magA = 0, magB = 0;
            for (let i = 0; i < userEmbedding.length; i++) {
              dot += userEmbedding[i] * cartoonEmbedding[i];
              magA += userEmbedding[i] * userEmbedding[i];
              magB += cartoonEmbedding[i] * cartoonEmbedding[i];
            }
            const dist = 1 - dot / (Math.sqrt(magA) * Math.sqrt(magB));
            if (dist < bestDist) {
              bestDist = dist;
              bestMatch = cartoonUrl;
            }
          } catch {}
        }
        if (!bestMatch) throw new Error("No cartoon face detected in any image (even fallback). Try a different photo.");
      }
      setMatched(bestMatch);
    } catch (e: any) {
      setError(e.message || "Matching failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
      {preview && (
        <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded" />
      )}
      <button
        className="px-4 py-2 bg-indigo-600 text-white rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Searching..." : "Submit"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {matched && (
        <div className="flex flex-col items-center">
          <p className="mb-2">You look like:</p>
          <img
            src={matched}
            alt="Matched Cartoon"
            className="mt-2 w-64 h-64 object-cover rounded"
          />
        </div>
      )}
      {loading && cartoonImages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {cartoonImages.map((url, i) => (
            <img key={i} src={url} alt="Cartoon" className="w-16 h-16 object-cover rounded opacity-50" />
          ))}
        </div>
      )}
    </div>
  );
}
