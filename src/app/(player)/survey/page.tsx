'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { submitSurvey, getTodaySurvey } from '@/lib/api'
import BodyMap from '@/components/ui/BodyMap'
import Link from 'next/link'

// Convert BodyMap Record<string,number> to API array format
function toApiPainSites(values: Record<string, number>) {
  return Object.entries(values)
    .filter(([, v]) => v > 0)
    .map(([site, severity]) => ({ site, severity }))
}

const SLEEP_OPTIONS = [
  { value: 1, label: '<5 hrs', color: 'text-red-400' },
  { value: 2, label: '5–6 hrs', color: 'text-orange-400' },
  { value: 3, label: '6–7 hrs', color: 'text-yellow-400' },
  { value: 4, label: '7–8 hrs', color: 'text-green-400' },
  { value: 5, label: '8+ hrs', color: 'text-green-300' },
]

const SCALE_LABELS: Record<number, string> = {
  1: 'Very Poor', 2: 'Poor', 3: 'Below Average',
  4: 'Average', 5: 'Good', 6: 'Very Good', 7: 'Excellent'
}

function ScaleButton({ value, selected, onClick }: { value: number; selected: boolean; onClick: () => void }) {
  const colors = ['', 'bg-red-500', 'bg-red-400', 'bg-orange-500', 'bg-yellow-500', 'bg-yellow-400', 'bg-green-400', 'bg-green-500']
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition border-2 ${selected ? `${colors[value]} text-white border-transparent` : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}>
      {value}
    </button>
  )
}

export default function SurveyPage() {
  const [token, setToken] = useState('')
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Survey state
  const [sleepHours, setSleepHours] = useState(0)
  const [sleepQuality, setSleepQuality] = useState(0)
  const [fatigue, setFatigue] = useState(0)
  const [mood, setMood] = useState(0)
  const [stress, setStress] = useState(0)
  const [motivation, setMotivation] = useState(0)
  const [soreness, setSoreness] = useState(0)
  const [readiness, setReadiness] = useState(0)
  const [painValues, setPainValues] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      try {
        const today = await getTodaySurvey(session.access_token)
        if (today) setAlreadyDone(true)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sleepHours || !sleepQuality || !fatigue || !mood || !stress || !motivation || !soreness || !readiness) {
      setError('Please complete all ratings before submitting.')
      return
    }
    setSubmitting(true); setError('')
    try {
      await submitSurvey({
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        fatigue,
        mood,
        stress,
        motivation,
        soreness,
        readiness,
        pain_sites: toApiPainSites(painValues),
        notes,
      }, token)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (done || alreadyDone) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
          <span className="text-green-400 text-2xl">✓</span>
        </div>
        <h2 className="text-white font-bold text-xl mb-2">{alreadyDone && !done ? "Today's check-in complete" : "Check-in submitted!"}</h2>
        <p className="text-zinc-400 text-sm mb-6">Your data has been recorded. The ARC engine will factor it into your readiness score.</p>
        <Link href="/player/report" className="inline-block bg-white text-black font-semibold px-6 py-2.5 rounded-lg hover:bg-zinc-100 transition text-sm">
          View my report →
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <span className="text-black font-black text-xs">A</span>
          </div>
          <span className="text-white font-semibold">Daily Check-in</span>
        </div>
        <Link href="/player/report" className="text-zinc-400 hover:text-white text-sm transition">My Report</Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-bold text-white">How are you feeling?</h1>
          <p className="text-zinc-400 text-sm mt-1">Takes about 2 minutes. Your coach sees aggregate risk only — not your individual answers.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

          {/* Sleep */}
          <section>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">😴</span> Sleep
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-zinc-400 text-sm mb-3">How many hours did you sleep?</p>
                <div className="flex gap-2">
                  {SLEEP_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setSleepHours(opt.value)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition border-2 ${sleepHours === opt.value ? 'bg-white text-black border-transparent' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${sleepHours === opt.value ? '' : opt.color}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-3">Sleep quality <span className="text-zinc-600">(1 = Very Poor, 7 = Excellent)</span></p>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5,6,7].map(v => <ScaleButton key={v} value={v} selected={sleepQuality === v} onClick={() => setSleepQuality(v)} />)}
                </div>
                {sleepQuality > 0 && <p className="text-zinc-500 text-xs mt-1.5 text-center">{SCALE_LABELS[sleepQuality]}</p>}
              </div>
            </div>
          </section>

          {/* Wellbeing */}
          <section>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🧠</span> Wellbeing
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Fatigue level', sublabel: '1 = Very tired, 7 = Full of energy', val: fatigue, set: setFatigue },
                { label: 'Mood', sublabel: '1 = Very bad, 7 = Excellent', val: mood, set: setMood },
                { label: 'Stress level', sublabel: '1 = Very stressed, 7 = Completely relaxed', val: stress, set: setStress },
                { label: 'Motivation to train', sublabel: '1 = No motivation, 7 = Highly motivated', val: motivation, set: setMotivation },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-zinc-400 text-sm mb-1">{item.label} <span className="text-zinc-600 text-xs">({item.sublabel})</span></p>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5,6,7].map(v => <ScaleButton key={v} value={v} selected={item.val === v} onClick={() => item.set(v)} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Physical */}
          <section>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">💪</span> Physical
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Muscle soreness', sublabel: '1 = Very sore, 7 = No soreness', val: soreness, set: setSoreness },
                { label: 'Overall readiness to train', sublabel: '1 = Not ready, 7 = Fully ready', val: readiness, set: setReadiness },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-zinc-400 text-sm mb-1">{item.label} <span className="text-zinc-600 text-xs">({item.sublabel})</span></p>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5,6,7].map(v => <ScaleButton key={v} value={v} selected={item.val === v} onClick={() => item.set(v)} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pain map */}
          <section>
            <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="text-xl">📍</span> Pain & Discomfort
            </h2>
            <p className="text-zinc-400 text-sm mb-4">Tap a body area to mark pain. Tap again to cycle severity (mild → moderate → severe → none).</p>
            <BodyMap values={painValues} onChange={(id, val) => setPainValues(prev => ({ ...prev, [id]: val }))} />
          </section>

          {/* Notes */}
          <section>
            <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="text-xl">📝</span> Anything else?
            </h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Any injuries, illness, or things your coach should know about..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition text-sm resize-none" />
          </section>

          <button type="submit" disabled={submitting}
            className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-100 transition disabled:opacity-50 text-sm">
            {submitting ? 'Submitting…' : 'Submit check-in'}
          </button>
        </form>
      </div>
    </div>
  )
}
