"use client"

import { useState } from "react"

// Import face-api.js dynamically to avoid SSR issues
const FACE_API_MODELS = "/models";

async function loadFaceApi() {
  const faceapi = await import("face-api.js");
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODELS),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS),
  ]);
  return faceapi;
}

// Fetch cartoon images from DuckDuckGo (demo, not for production)
async function fetchCartoonImages(query = "cartoon character", count = 8) {
  // Use DuckDuckGo unofficial API via a public proxy (for demo)
  const url = `/api/cartoon-search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  // Return only images with a valid URL
  return data.results.slice(0, count).map((img: any) => img.image);
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
      // 1. Load face-api.js and models
      const faceapi = await loadFaceApi();

      // 2. Fetch cartoon images
      const cartoonUrls = await fetchCartoonImages();
      setCartoonImages(cartoonUrls);

      // 3. Compute embedding for uploaded photo
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

      // 4. For each cartoon image, compute embedding and compare
      let bestMatch = null;
      let bestDist = Infinity;
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
          const cartoonEmbedding = cartoonDetection.descriptor;
          // Cosine distance
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
        } catch (e) {
          // Ignore errors for individual images
        }
      }
      if (!bestMatch) throw new Error("No cartoon face detected in any image.");
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
