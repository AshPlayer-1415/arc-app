'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getMyReport, getMyTrend, getMyConfirmations, respondToConfirmation } from '@/lib/api'
import RiskBadge from '@/components/ui/RiskBadge'
import BodyMap from '@/components/ui/BodyMap'
import Link from 'next/link'

type Report = {
  risk_color: string
  overall_risk_score: number
  primary_concern: string
  data_tier: string
  signal_scores: Record<string, number>
  recommendations: string[]
  acwr?: number
  output_drop?: number
  pain_severity?: number
  recovery_deficit?: number
  mechanical_stress?: number
}

type TrendPoint = {
  date: string
  overall_risk_score: number
  risk_color: string
}

type Confirmation = {
  id: string
  status: string
  gps_sessions: { session_date: string; total_distance: number; player_load: number }
  players: { first_name: string; last_name: string }
}

const SIGNAL_LABELS: Record<string, string> = {
  acwr: 'Training Load (ACWR)',
  output_drop: 'Output Drop',
  pain_severity: 'Pain Level',
  recovery_deficit: 'Recovery',
  mechanical_stress: 'Mechanical Stress',
}

const RISK_COLORS: Record<string, string> = {
  RED: 'text-red-400',
  ORANGE: 'text-orange-400',
  YELLOW: 'text-yellow-400',
  GREEN: 'text-green-400',
}

function SignalBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.7 ? 'bg-red-500' : score >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function PlayerReport() {
  const [token, setToken] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [confirmations, setConfirmations] = useState<Confirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setToken(session.access_token)

      const [r, t, c] = await Promise.allSettled([
        getMyReport(session.access_token),
        getMyTrend(session.access_token),
        getMyConfirmations(session.access_token),
      ])

      if (r.status === 'fulfilled') setReport(r.value)
      if (t.status === 'fulfilled') setTrend(t.value || [])
      if (c.status === 'fulfilled') setConfirmations((c.value || []).filter((x: Confirmation) => x.status === 'pending'))
      setLoading(false)
    }
    load()
  }, [])

  async function handleConfirm(id: string, confirmed: boolean) {
    setResponding(id)
    try {
      await respondToConfirmation(id, confirmed, token)
      setConfirmations(prev => prev.filter(c => c.id !== id))
    } catch {}
    setResponding(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <span className="text-black font-black text-xs">A</span>
          </div>
          <span className="text-white font-semibold">My Report</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/player/plan" className="text-sm text-zinc-400 hover:text-white transition">My Plan</Link>
          <Link href="/player/survey" className="text-sm bg-white text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition">
            Check-in
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* GPS Confirmations */}
        {confirmations.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span>🎯</span> GPS Session Confirmation
            </h3>
            {confirmations.map(c => (
              <div key={c.id} className="bg-zinc-800 rounded-lg p-4">
                <p className="text-zinc-300 text-sm mb-1">
                  Session on <span className="text-white font-medium">{new Date(c.gps_sessions.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </p>
                <p className="text-zinc-500 text-xs mb-3">
                  Distance: {(c.gps_sessions.total_distance / 1000).toFixed(1)} km · Load: {Math.round(c.gps_sessions.player_load)} AU
                </p>
                <p className="text-zinc-400 text-sm mb-3">Was this session data yours?</p>
                <div className="flex gap-2">
                  <button onClick={() => handleConfirm(c.id, true)} disabled={responding === c.id}
                    className="flex-1 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50">
                    {responding === c.id ? '…' : 'Yes, that\'s me'}
                  </button>
                  <button onClick={() => handleConfirm(c.id, false)} disabled={responding === c.id}
                    className="flex-1 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition disabled:opacity-50">
                    Not me
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No report yet */}
        {!report && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-white font-semibold mb-1">No report yet</p>
            <p className="text-zinc-400 text-sm mb-6">Complete your daily check-in to get your first readiness report.</p>
            <Link href="/player/survey" className="inline-block bg-white text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-zinc-100 transition text-sm">
              Start check-in →
            </Link>
          </div>
        )}

        {report && (
          <>
            {/* Risk summary card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Today's Readiness</p>
                  <p className="text-sm text-zinc-400 capitalize">{report.data_tier?.replace('_', ' ')} data</p>
                </div>
                <RiskBadge color={report.risk_color} score={report.overall_risk_score} />
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{report.primary_concern}</p>
            </div>

            {/* Signal breakdown */}
            {report.signal_scores && Object.keys(report.signal_scores).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-white font-semibold text-sm">Signal Breakdown</h3>
                {Object.entries(report.signal_scores).map(([key, val]) => (
                  <SignalBar key={key} label={SIGNAL_LABELS[key] || key} score={val} />
                ))}
              </div>
            )}

            {/* Trend sparkline */}
            {trend.length > 1 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">7-Day Risk Trend</h3>
                <div className="flex items-end gap-1.5 h-16">
                  {trend.slice(-7).map((t, i) => {
                    const h = Math.round(t.overall_risk_score * 64)
                    const color = t.risk_color === 'RED' ? 'bg-red-500' : t.risk_color === 'ORANGE' ? 'bg-orange-500' : t.risk_color === 'YELLOW' ? 'bg-yellow-500' : 'bg-green-500'
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full ${color} rounded-sm opacity-80`} style={{ height: `${h}px` }} />
                        <p className="text-zinc-600 text-xs">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' })}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-zinc-600 mt-0.5">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA to plan */}
            <Link href="/player/plan"
              className="block bg-zinc-900 border border-zinc-700 rounded-xl p-5 hover:border-zinc-500 transition group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">View My Training Plan</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Personalised adjustments based on your readiness</p>
                </div>
                <span className="text-zinc-500 group-hover:text-white transition text-lg">→</span>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
