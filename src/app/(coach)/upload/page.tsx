'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type UploadTab = 'catapult' | 'whoop'

type UploadResult = {
  matched: number
  pending_confirmation: number
  unmatched: number
  sessions_created: number
  engine_triggered: boolean
  errors: string[]
}

function FileDropZone({
  label, hint, multiple, accepts, files, onChange,
}: {
  label: string; hint: string; multiple?: boolean
  accepts?: string; files: File[]; onChange: (f: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    onChange(multiple ? [...files, ...dropped] : dropped.slice(0, 1))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || [])
    onChange(multiple ? [...files, ...picked] : picked.slice(0, 1))
    e.target.value = ''
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition select-none ${dragging ? 'border-white/50 bg-white/5' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50'}`}>
      <input ref={inputRef} type="file" accept={accepts} multiple={multiple} className="hidden" onChange={handleChange} />
      <div className="text-2xl mb-2">📁</div>
      <p className="text-white font-medium text-sm mb-1">{label}</p>
      <p className="text-zinc-500 text-xs">{hint}</p>
      {files.length > 0 && (
        <div className="mt-4 space-y-1.5" onClick={e => e.stopPropagation()}>
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-green-400 text-xs shrink-0">✓</span>
                <p className="text-zinc-300 text-xs truncate">{f.name}</p>
                <p className="text-zinc-600 text-xs shrink-0">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-zinc-500 hover:text-red-400 ml-2 text-xs shrink-0 transition">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UploadPage() {
  const [tab, setTab] = useState<UploadTab>('catapult')
  const [token, setToken] = useState('')
  const [teamId, setTeamId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')

  // Catapult
  const [gpsFiles, setGpsFiles] = useState<File[]>([])
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))

  // Whoop / wearable
  const [whoopFiles, setWhoopFiles] = useState<File[]>([])
  const [whoopType, setWhoopType] = useState('whoop')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).then(r => r.json()).catch(() => [])
      if (Array.isArray(res) && res[0]) setTeamId(res[0].id)
    }
    load()
  }, [])

  async function handleCatapultUpload(e: React.FormEvent) {
    e.preventDefault()
    if (gpsFiles.length === 0) { setError('Please select at least one GPS file.'); return }
    if (!teamId) { setError('No team found — create a team first from the dashboard.'); return }

    setUploading(true); setError(''); setResult(null)

    const aggregate: UploadResult = { matched: 0, pending_confirmation: 0, unmatched: 0, sessions_created: 0, engine_triggered: false, errors: [] }

    for (const file of gpsFiles) {
      try {
        const form = new FormData()
        form.append('team_id', teamId)
        form.append('gps_file', file)
        form.append('session_date', sessionDate)

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/gps`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        if (res.ok) {
          const data = await res.json()
          aggregate.matched += data.matched || 0
          aggregate.pending_confirmation += data.pending_confirmation || 0
          aggregate.unmatched += data.unmatched || 0
          aggregate.sessions_created += data.sessions_created || 0
          if (data.engine_triggered) aggregate.engine_triggered = true
        } else {
          const err = await res.json().catch(() => ({}))
          aggregate.errors.push(`${file.name}: ${err.detail || 'Upload failed'}`)
        }
      } catch {
        aggregate.errors.push(`${file.name}: Network error`)
      }
    }
    setResult(aggregate)
    setGpsFiles([])
    setUploading(false)
  }

  async function handleWhoopUpload(e: React.FormEvent) {
    e.preventDefault()
    if (whoopFiles.length === 0) { setError('Please select at least one wearable export file.'); return }

    setUploading(true); setError(''); setResult(null)

    const aggregate: UploadResult = { matched: 0, pending_confirmation: 0, unmatched: 0, sessions_created: 0, engine_triggered: false, errors: [] }

    for (const file of whoopFiles) {
      try {
        const form = new FormData()
        form.append('wearable_file', file)
        form.append('device_type', whoopType)

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/wearable`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        if (res.ok) {
          const data = await res.json()
          aggregate.sessions_created += data.sessions_created || 1
        } else {
          const err = await res.json().catch(() => ({}))
          aggregate.errors.push(`${file.name}: ${err.detail || 'Upload failed'}`)
        }
      } catch {
        aggregate.errors.push(`${file.name}: Network error`)
      }
    }
    setResult(aggregate)
    setWhoopFiles([])
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-zinc-400 hover:text-white text-sm transition">← Dashboard</Link>
        <span className="text-zinc-700">|</span>
        <span className="text-white font-semibold">Upload Session Data</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-8">
        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl mb-8">
          {([
            { id: 'catapult' as const, label: '📡 Catapult / GPS', sub: 'Team GPS export' },
            { id: 'whoop' as const, label: '⌚ Wearable / WHOOP', sub: 'Device recovery data' },
          ]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError('') }}
              className={`py-3 rounded-lg text-left px-4 transition ${tab === t.id ? 'bg-white' : 'hover:bg-zinc-800'}`}>
              <p className={`text-sm font-semibold ${tab === t.id ? 'text-black' : 'text-white'}`}>{t.label}</p>
              <p className={`text-xs mt-0.5 ${tab === t.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{t.sub}</p>
            </button>
          ))}
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">{error}</div>}

        {/* Result panel */}
        {result && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6 space-y-3">
            <p className="text-white font-semibold text-sm">Upload complete</p>
            <div className="grid grid-cols-2 gap-2">
              {result.sessions_created > 0 && (
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-zinc-400 text-xs">Sessions</p>
                  <p className="text-white font-bold text-2xl">{result.sessions_created}</p>
                </div>
              )}
              {result.matched > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <p className="text-zinc-400 text-xs">Matched</p>
                  <p className="text-green-400 font-bold text-2xl">{result.matched}</p>
                </div>
              )}
              {result.pending_confirmation > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                  <p className="text-zinc-400 text-xs">Needs confirm</p>
                  <p className="text-yellow-400 font-bold text-2xl">{result.pending_confirmation}</p>
                </div>
              )}
              {result.unmatched > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <p className="text-zinc-400 text-xs">Unmatched</p>
                  <p className="text-red-400 font-bold text-2xl">{result.unmatched}</p>
                </div>
              )}
            </div>
            {result.engine_triggered && <p className="text-green-400 text-xs">⚡ Engine triggered — dashboard updating.</p>}
            {result.errors.length > 0 && result.errors.map((e, i) => <p key={i} className="text-red-400 text-xs">{e}</p>)}
            <Link href="/dashboard" className="block text-center text-sm text-white underline">View dashboard →</Link>
          </div>
        )}

        {/* ── CATAPULT ── */}
        {tab === 'catapult' && (
          <form onSubmit={handleCatapultUpload} className="space-y-5">
            <div>
              <h2 className="text-white font-semibold mb-1">Catapult GPS Export</h2>
              <p className="text-zinc-400 text-xs">Upload one or multiple CSV exports from Catapult OpenField or IQ. ARC will automatically match sessions to your roster.</p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Session date</label>
              <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
              <p className="text-zinc-600 text-xs mt-1">When the training or match took place</p>
            </div>

            <FileDropZone
              label="Drop GPS files here or click to browse"
              hint="Catapult .csv exports · Multiple files supported"
              accepts=".csv"
              multiple
              files={gpsFiles}
              onChange={setGpsFiles}
            />

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 space-y-1">
              <p className="text-zinc-400 text-xs font-medium">Player matching</p>
              <p className="text-zinc-600 text-xs">ARC fuzzy-matches GPS names to your roster. High confidence → auto-linked. Medium confidence → player gets an "Is this you?" prompt in their report.</p>
            </div>

            <button type="submit" disabled={uploading || gpsFiles.length === 0}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-100 transition disabled:opacity-40 text-sm">
              {uploading
                ? `Uploading ${gpsFiles.length} file${gpsFiles.length > 1 ? 's' : ''}…`
                : gpsFiles.length > 0
                  ? `Upload ${gpsFiles.length} file${gpsFiles.length > 1 ? 's' : ''} & run engine`
                  : 'Select files to upload'}
            </button>
          </form>
        )}

        {/* ── WHOOP / WEARABLE ── */}
        {tab === 'whoop' && (
          <form onSubmit={handleWhoopUpload} className="space-y-5">
            <div>
              <h2 className="text-white font-semibold mb-1">Wearable Device Export</h2>
              <p className="text-zinc-400 text-xs">Upload team-level recovery data. Individual players can also upload their own device exports from their profile page.</p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-2">Device type</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'whoop', label: 'WHOOP' },
                  { id: 'oura', label: 'Oura Ring' },
                  { id: 'garmin', label: 'Garmin' },
                  { id: 'polar', label: 'Polar' },
                  { id: 'fitbit', label: 'Fitbit' },
                  { id: 'other', label: 'Other' },
                ].map(d => (
                  <button key={d.id} type="button" onClick={() => setWhoopType(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${whoopType === d.id ? 'bg-white text-black border-transparent' : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <FileDropZone
              label="Drop wearable export files here"
              hint=".csv or .json exports · Multiple files supported"
              accepts=".csv,.json"
              multiple
              files={whoopFiles}
              onChange={setWhoopFiles}
            />

            <button type="submit" disabled={uploading || whoopFiles.length === 0}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-100 transition disabled:opacity-40 text-sm">
              {uploading
                ? `Uploading ${whoopFiles.length} file${whoopFiles.length > 1 ? 's' : ''}…`
                : whoopFiles.length > 0
                  ? `Upload ${whoopFiles.length} file${whoopFiles.length > 1 ? 's' : ''}`
                  : 'Select files to upload'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
