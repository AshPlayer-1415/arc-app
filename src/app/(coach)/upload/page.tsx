'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { uploadGPS } from '@/lib/api'
import Link from 'next/link'

export default function UploadPage() {
  const [gpsFile, setGpsFile] = useState<File | null>(null)
  const [wellnessFile, setWellnessFile] = useState<File | null>(null)
  const [detailsFile, setDetailsFile] = useState<File | null>(null)
  const [teamId, setTeamId] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!gpsFile || !teamId) { setError('GPS file and Team ID are required'); return }
    setLoading(true); setError(''); setResult(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated'); setLoading(false); return }

    try {
      const res = await uploadGPS(teamId, {
        gps: gpsFile,
        wellness: wellnessFile ?? undefined,
        playerDetails: detailsFile ?? undefined,
      }, session.access_token)
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
    setLoading(false)
  }

  function FileDropzone({ label, file, onChange, hint }: {
    label: string; file: File | null; onChange: (f: File) => void; hint: string
  }) {
    const ref = useRef<HTMLInputElement>(null)
    return (
      <div onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition text-center ${file ? 'border-green-500/50 bg-green-500/5' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'}`}>
        <input ref={ref} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
        <p className="text-sm font-medium text-zinc-300">{label}</p>
        {file ? (
          <p className="text-green-400 text-xs mt-1">✓ {file.name}</p>
        ) : (
          <p className="text-zinc-500 text-xs mt-1">{hint}</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link href="/coach/dashboard" className="text-zinc-400 hover:text-white text-sm transition">← Dashboard</Link>
        <span className="text-zinc-700">|</span>
        <span className="text-white font-semibold">Upload GPS Data</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Upload session data</h1>
          <p className="text-zinc-400 text-sm">Upload your Catapult GPS export. Wellness and player details are optional but improve matching accuracy.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Team ID</label>
            <input value={teamId} onChange={e => setTeamId(e.target.value)} required
              placeholder="Paste your team UUID from the dashboard"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition font-mono text-sm" />
          </div>

          <FileDropzone label="Catapult GPS Export *" file={gpsFile} onChange={setGpsFile} hint="Drop or click to select .csv file" />
          <FileDropzone label="Wellness Survey (optional)" file={wellnessFile} onChange={setWellnessFile} hint="Microsoft Forms export .csv" />
          <FileDropzone label="Player Details (optional)" file={detailsFile} onChange={setDetailsFile} hint="Roster with jersey numbers .csv" />

          <button type="submit" disabled={loading || !gpsFile}
            className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-100 transition disabled:opacity-50">
            {loading ? 'Processing…' : 'Upload & Run Engine'}
          </button>
        </form>

        {result && (
          <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Upload complete</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs">GPS rows saved</p>
                <p className="text-white font-bold text-lg">{(result.summary as Record<string, unknown>)?.total_gps_rows as number ?? 0}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs">Auto-matched</p>
                <p className="text-green-400 font-bold text-lg">{(result.summary as Record<string, unknown>)?.auto_matched_players as number ?? 0}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs">Awaiting confirmation</p>
                <p className="text-yellow-400 font-bold text-lg">{(result.summary as Record<string, unknown>)?.pending_confirmation as number ?? 0}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs">Unmatched</p>
                <p className="text-red-400 font-bold text-lg">{((result.summary as Record<string, unknown>)?.unmatched_names as string[] ?? []).length}</p>
              </div>
            </div>
            {((result.summary as Record<string, unknown>)?.unmatched_names as string[] ?? []).length > 0 && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs mb-1">Unmatched names in GPS file</p>
                <div className="flex flex-wrap gap-1.5">
                  {((result.summary as Record<string, unknown>)?.unmatched_names as string[]).map((n: string) => (
                    <span key={n} className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">{n}</span>
                  ))}
                </div>
              </div>
            )}
            <Link href="/coach/dashboard" className="block text-center text-sm text-white underline mt-2">View dashboard →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
