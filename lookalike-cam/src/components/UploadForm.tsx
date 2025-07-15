"use client";

import { useState } from "react";
import axios from "axios";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [matchedImage, setMatchedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/api/match", formData);
      setMatchedImage(res.data.matchedImage);
    } catch (err) {
      console.error("Upload error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center mt-10 gap-4">
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button
        className="bg-indigo-600 text-white px-4 py-2 rounded"
        onClick={handleSubmit}
      >
        {loading ? "Searching..." : "Submit"}
      </button>

      {matchedImage && (
        <img
          src={matchedImage}
          alt="Matched Character"
          className="mt-4 w-64 h-64 object-cover rounded-lg shadow"
        />
      )}
    </div>
  );
}
