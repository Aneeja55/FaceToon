'use client';
import React, { useRef, useState, useEffect } from 'react';
import { loadModels, getFaceEmbedding } from '../utils/faceUtils';
import cartoonEmbeddingsData from '../lib/cartoonEmbeddings.json';
import { CartoonCharacter } from '../lib/types';
import NextImage from 'next/image';
import UploadForm from "@/components/UploadForm";

const cartoonEmbeddings = cartoonEmbeddingsData as CartoonCharacter[];

const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
};

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [match, setMatch] = useState<CartoonCharacter | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const load = async () => {
      await loadModels();
      setModelsLoaded(true);
    };
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imgURL = URL.createObjectURL(file);
    setPreview(imgURL);

    const img = new Image();
  img.src = imgURL;
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    console.log("Image loaded and ready");
    setImageElement(img); // store for later use on submit
    };
  };

  const handleSubmit = async () => {
    if (!modelsLoaded) return alert('Please wait, loading models...');
    if (!imageElement) return alert('No image loaded.');

    const userEmbedding = await getFaceEmbedding(imageElement);
    if (!userEmbedding) return alert('No face detected!');

    let best: { sim: number; character: CartoonCharacter | null } = {
      sim: -1,
      character: null,
    };

    for (const cartoon of cartoonEmbeddings) {
      const sim = cosineSimilarity(userEmbedding, new Float32Array(cartoon.embedding));
      if (sim > best.sim) best = { sim, character: cartoon };
    }
    console.log("imageElement:", imageElement);

    setMatch(best.character);
  };

  return (
    <main className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">FaceToon</h1>
      <UploadForm />
      {preview && (
        <NextImage
          src={preview}
          alt="Uploaded"
          width={192}
          height={192}
          className="mt-4 rounded"
        />
      )}
      {preview && (
        <button
          onClick={handleSubmit}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Submit
        </button>
      )}
      {match && (
        <div className="mt-6 text-center">
          <h2 className="text-xl font-semibold">You look like:</h2>
          <NextImage
            src={match.image}
            alt={match.name}
            width={160}
            height={160}
            className="mx-auto mt-2"
          />
          <p className="mt-2 font-bold">{match.name}</p>
        </div>
      )}
    </main>
  );
}
