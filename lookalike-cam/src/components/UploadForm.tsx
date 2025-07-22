"use client"

import { useState } from "react"
import axios, { AxiosError } from "axios"

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [matched, setMatched] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file) {
      setError("Select an image first.")
      return
    }
    setLoading(true)
    setError(null)

    const form = new FormData()
    form.append("file", file)

    try {
      // let axios auto-set the multipart headers
      const { data } = await axios.post<{ matchedUrl: string }>(
        "/api/match",
        form
      )
      setMatched(data.matchedUrl)
    } catch (e: unknown) {
      const err = e as AxiosError<{ error: string }>
      setError(err.response?.data.error || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        className="px-4 py-2 bg-indigo-600 text-white rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Searching..." : "Submit"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {matched && (
        <img
          src={matched}
          alt="Matched Cartoon"
          className="mt-4 w-64 h-64 object-cover rounded"
        />
      )}
    </div>
  )
}
