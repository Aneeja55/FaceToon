"use client"

import { useState } from "react"

const FACE_API_MODELS = "/models";

// Fetch all cartoon image filenames from the backend
async function fetchStaticCartoonList(): Promise<string[]> {
  const res = await fetch("/api/static-cartoons");
  const data = await res.json();
  return data.files.map((f: string) => `/cartoon_characters/${f}`);
}

async function loadFaceApi() {
  const faceapi = await import("face-api.js");
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_API_MODELS),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS),
  ]);
  return faceapi;
}

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [matched, setMatched] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

    try {
      const faceapi = await loadFaceApi();
      // 1. Fetch static cartoon images
      const staticCartoons = await fetchStaticCartoonList();
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
      // 3. For each static cartoon image, compute embedding and compare
      let bestMatch = null;
      let bestDist = Infinity;
      for (const cartoonUrl of staticCartoons) {
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
      if (!bestMatch) throw new Error("No cartoon face detected in any image. Try a different photo.");
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
    </div>
  );
}
