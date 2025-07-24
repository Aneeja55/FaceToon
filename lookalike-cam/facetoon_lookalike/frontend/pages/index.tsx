import { useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("image", selectedFile);

    setLoading(true);
    const res = await fetch("http://localhost:5000/match", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-6 flex flex-col items-center gap-6 bg-gray-100">
      <h1 className="text-3xl font-bold">👯 Lookalike Cam</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        className="bg-white p-2 rounded"
      />

      <button
        onClick={handleUpload}
        disabled={!selectedFile || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Finding Match..." : "Find Lookalike"}
      </button>

      {result && (
        <div className="mt-8 text-center">
          <p className="text-xl mb-2">You look like:</p>
          <img src={result.image_url} alt={result.name} className="w-48 h-48 object-contain mx-auto mb-2" />
          <h2 className="text-2xl font-semibold">{result.name}</h2>
          <p>Similarity: {(result.similarity * 100).toFixed(2)}%</p>
        </div>
      )}
    </main>
  );
}
