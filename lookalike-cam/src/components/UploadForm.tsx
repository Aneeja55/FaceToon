"use client"

import { useState, useRef } from "react"

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

function getFilenameFromUrl(url: string): string {
  const parts = url.split("/");
  return decodeURIComponent(parts[parts.length - 1].replace(/\.[^.]+$/, ""));
}

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [matched, setMatched] = useState<string | null>(null);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setMatched(null);
    setMatchedName(null);
    setError(null);
    setPreview(f ? URL.createObjectURL(f) : null);
    setShowCamera(false);
  };

  // Handle camera open
  const handleOpenCamera = async () => {
    setShowCamera(true);
    setMatched(null);
    setMatchedName(null);
    setError(null);
    setPreview(null);
    setFile(null);
    setTimeout(async () => {
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        } catch (err) {
          setError("Unable to access camera.");
          setShowCamera(false);
        }
      }
    }, 100); // ensure videoRef is attached
  };

  // Handle camera close
  const handleCloseCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraActive(false);
  };

  // Handle take photo
  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const f = new File([blob], "photo.jpg", { type: "image/jpeg" });
            setFile(f);
            setPreview(URL.createObjectURL(blob));
            setShowCamera(false);
            handleCloseCamera();
          }
        }, "image/jpeg");
      }
    }
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setMatched(null);
    setMatchedName(null);
    setError(null);
    setPreview(null);
    setShowCamera(false);
    setCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Main face matching logic
  const handleSubmit = async () => {
    if (!file) {
      setError("Select or take a photo first.");
      return;
    }
    setLoading(true);
    setError(null);
    setMatched(null);
    setMatchedName(null);

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
      setMatchedName(getFilenameFromUrl(bestMatch));
    } catch (e: any) {
      setError(e.message || "Matching failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto bg-white/80 rounded-xl shadow-lg p-8 mt-8">
      <h2 className="text-2xl font-bold mb-2 text-indigo-700">Find Your Cartoon Lookalike!</h2>
      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
        <label className="flex-1 flex flex-col items-center cursor-pointer border-2 border-dashed border-indigo-400 rounded-lg p-4 hover:bg-indigo-50 transition">
          <span className="mb-2 text-indigo-600 font-semibold">Upload Photo</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
            aria-label="Upload photo"
          />
          <span className="text-xs text-gray-500">(JPG, PNG, etc.)</span>
        </label>
        <button
          type="button"
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-indigo-400 rounded-lg p-4 hover:bg-indigo-50 transition text-indigo-600 font-semibold disabled:opacity-50"
          onClick={handleOpenCamera}
          disabled={loading}
          aria-label="Take photo with camera"
        >
          <span className="mb-2">Take Photo</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12a9.75 9.75 0 1119.5 0 9.75 9.75 0 01-19.5 0z" />
          </svg>
        </button>
      </div>
      {showCamera && (
        <div className="flex flex-col items-center gap-2 w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="rounded-lg border border-indigo-300 w-full max-w-xs aspect-video bg-black"
            style={{ minHeight: 200 }}
          />
          <div className="flex gap-4 mt-2">
            <button
              type="button"
              className="px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition"
              onClick={handleTakePhoto}
              aria-label="Capture photo"
            >
              Capture
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded shadow hover:bg-gray-400 transition"
              onClick={handleCloseCamera}
              aria-label="Cancel camera"
            >
              Cancel
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      {preview && !showCamera && (
        <div className="flex flex-col items-center gap-2">
          <img src={preview} alt="Preview" className="w-40 h-40 object-cover rounded-lg border border-indigo-200 shadow" />
          <span className="text-xs text-gray-500">Preview</span>
        </div>
      )}
      <button
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded font-semibold shadow hover:bg-indigo-700 transition disabled:opacity-50"
        onClick={handleSubmit}
        disabled={loading || (!file && !preview)}
        aria-label="Find lookalike"
      >
        {loading ? (
          <span className="flex items-center gap-2 justify-center">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            Searching...
          </span>
        ) : "Find Lookalike"}
      </button>
      {error && <p className="text-red-500 font-semibold mt-2">{error}</p>}
      {matched && (
        <div className="flex flex-col items-center mt-6 gap-2">
          <p className="text-lg font-semibold text-indigo-700 mb-2">You look like:</p>
          <img
            src={matched}
            alt="Matched Cartoon"
            className="w-48 h-48 object-cover rounded-lg border-4 border-indigo-400 shadow-lg"
          />
          {matchedName && (
            <span className="mt-2 text-indigo-800 font-bold text-lg">{matchedName}</span>
          )}
          <button
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded shadow hover:bg-gray-300 transition"
            onClick={handleReset}
            aria-label="Try again"
          >
            Try Again
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4 text-center">Your photo is processed only in your browser. No images are uploaded to any server.</p>
    </div>
  );
}
