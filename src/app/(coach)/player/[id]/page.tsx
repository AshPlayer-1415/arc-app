'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getTeamDashboard, runEngineForPlayer } from '@/lib/api'
import RiskBadge from '@/components/ui/RiskBadge'
import BodyMap from '@/components/ui/BodyMap'
import Link from 'next/link'

function toBodyMapValues(sites?: { site: string; severity: number }[]): Record<string, number> {
  if (!sites) return {}
  return Object.fromEntries(sites.map(s => [s.site, s.severity]))
}

type PlayerFull = {
  player_id: string
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
  pain_sites?: { site: string; severity: number }[]
  last_survey?: {
    fatigue: number
    mood: number
    stress: number
    soreness: number
    readiness: number
    sleep_hours: number
    sleep_quality: number
    notes: string
    submitted_at: string
  }
  players: {
    first_name: string
    last_name: string
    jersey_number: number
    position: string
    data_tier: string
    whoop_connected: boolean
    catapult_matched: boolean
  }
}

const SIGNAL_LABELS: Record<string, string> = {
  acwr: 'Training Load (ACWR)',
  output_drop: 'Output Drop',
  pain_severity: 'Pain Level',
  recovery_deficit: 'Recovery Deficit',
  mechanical_stress: 'Mechanical Stress',
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

function SurveyPill({ label, value, max = 7 }: { label: string; value: number; max?: number }) {
  const pct = value / max
  const color = pct >= 0.7 ? 'text-green-400' : pct >= 0.4 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="bg-zinc-800 rounded-lg p-3 text-center">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className={`font-bold text-lg ${color}`}>{value}<span className="text-zinc-600 text-xs">/{max}</span></p>
    </div>
  )
}

export default function CoachPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [token, setToken] = useState('')
  const [teamId, setTeamId] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setToken(session.access_token)

      // Get team first
      const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).then(r => r.json()).catch(() => [])

      const firstTeam = Array.isArray(teamsRes) ? teamsRes[0] : null
      if (!firstTeam) { setLoading(false); return }
      setTeamId(firstTeam.id)

      // Get dashboard and find this player
      const ctx = await getTeamDashboard(firstTeam.id, session.access_token)
      const found = (ctx.risk_reports || []).find((p: PlayerFull) => p.player_id === id)
      setPlayer(found || null)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleRunEngine() {
    setRunning(true)
    await runEngineForPlayer(id, token).catch(() => {})
    // Re-fetch dashboard to get updated player
    const ctx = await getTeamDashboard(teamId, token).catch(() => ({ risk_reports: [] }))
    const found = ctx.risk_reports?.find((p: PlayerFull) => p.player_id === id)
    if (found) setPlayer(found)
    setRunning(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (!player) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-400 mb-4">Player not found or no report available.</p>
        <Link href="/dashboard" className="text-white underline text-sm">← Back to dashboard</Link>
      </div>
    </div>
  )

  const p = player.players
  const survey = player.last_survey

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white text-sm transition">← Dashboard</Link>
          <span className="text-zinc-700">|</span>
          <span className="text-white font-semibold">{p?.first_name} {p?.last_name}</span>
        </div>
        <button onClick={handleRunEngine} disabled={running}
          className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
          {running ? 'Running…' : '⚡ Refresh Engine'}
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Player header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-white font-bold text-xl">{p?.first_name} {p?.last_name}</h1>
              <p className="text-zinc-400 text-sm mt-0.5">
                #{p?.jersey_number} · {p?.position || 'Player'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">
                  {player.data_tier?.replace('_', ' ')} data
                </span>
                {p?.catapult_matched && (
                  <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">GPS linked</span>
                )}
                {p?.whoop_connected && (
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Whoop linked</span>
                )}
              </div>
            </div>
            <RiskBadge color={player.risk_color} score={player.overall_risk_score} />
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">{player.primary_concern}</p>
        </div>

        {/* Signal breakdown */}
        {player.signal_scores && Object.keys(player.signal_scores).length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">Signal Breakdown</h3>
            {Object.entries(player.signal_scores).map(([key, val]) => (
              <SignalBar key={key} label={SIGNAL_LABELS[key] || key} score={val} />
            ))}
          </div>
        )}

        {/* Today's survey */}
        {survey && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Today's Check-in</h3>
              <p className="text-zinc-600 text-xs">
                {new Date(survey.submitted_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <SurveyPill label="Fatigue" value={survey.fatigue} />
              <SurveyPill label="Mood" value={survey.mood} />
              <SurveyPill label="Stress" value={survey.stress} />
              <SurveyPill label="Soreness" value={survey.soreness} />
              <SurveyPill label="Readiness" value={survey.readiness} />
              <SurveyPill label="Sleep hrs" value={survey.sleep_hours} max={5} />
              <SurveyPill label="Sleep qual" value={survey.sleep_quality} />
            </div>
            {survey.notes && (
              <div className="bg-zinc-800 rounded-lg p-3 mt-2">
                <p className="text-zinc-500 text-xs mb-1">Player note</p>
                <p className="text-zinc-300 text-sm italic">"{survey.notes}"</p>
              </div>
            )}
          </div>
        )}

        {/* Pain sites (read-only body map) */}
        {player.pain_sites && player.pain_sites.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Reported Pain Sites</h3>
            <BodyMap values={toBodyMapValues(player.pain_sites)} onChange={() => {}} readOnly />
          </div>
        )}

        {/* Recommendations */}
        {player.recommendations && player.recommendations.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3">Engine Recommendations</h3>
            <ul className="space-y-2">
              {player.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-zinc-600 mt-0.5">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  )
}
