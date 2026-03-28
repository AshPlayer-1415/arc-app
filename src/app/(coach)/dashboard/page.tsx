'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getTeamDashboard, runEngineForTeam } from '@/lib/api'
import RiskBadge from '@/components/ui/RiskBadge'
import Link from 'next/link'

type Player = {
  player_id: string
  risk_color: string
  overall_risk_score: number
  primary_concern: string
  data_tier: string
  players: { first_name: string; last_name: string; jersey_number: number; position: string }
}

export default function CoachDashboard() {
  const [players, setPlayers] = useState<Player[]>([])
  const [team, setTeam] = useState<{ name: string; id: string } | null>(null)
  const [missing, setMissing] = useState<{ first_name: string; last_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)

      // Get teams for this coach
      const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).then(r => r.json()).catch(() => [])

      const firstTeam = Array.isArray(teamsRes) ? teamsRes[0] : null
      if (!firstTeam) { setLoading(false); return }
      setTeam(firstTeam)

      const ctx = await getTeamDashboard(firstTeam.id, session.access_token)
      setPlayers(ctx.risk_reports || [])
      setMissing(ctx.missing_surveys || [])
      setLoading(false)
    }
    load()
  }, [])

  const redCount = players.filter(p => p.risk_color === 'RED').length
  const orangeCount = players.filter(p => p.risk_color === 'ORANGE').length

  async function handleRunEngine() {
    if (!team) return
    setRunning(true)
    await runEngineForTeam(team.id, token).catch(() => {})
    window.location.reload()
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
          <span className="text-white font-semibold">{team?.name || 'ARC'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/upload" className="text-sm text-zinc-400 hover:text-white transition">Upload GPS</Link>
          <Link href="/roster" className="text-sm text-zinc-400 hover:text-white transition">Roster</Link>
          <button onClick={handleRunEngine} disabled={running}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
            {running ? 'Running…' : '⚡ Run Engine'}
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Players', val: players.length, color: 'text-white' },
            { label: 'RED — Stop', val: redCount, color: 'text-red-400' },
            { label: 'ORANGE — Reduce', val: orangeCount, color: 'text-orange-400' },
            { label: 'Missing Survey', val: missing.length, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-xs mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Missing survey alert */}
        {missing.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-yellow-400 mt-0.5">⚠</span>
            <div>
              <p className="text-yellow-400 text-sm font-medium">Missing today&apos;s survey</p>
              <p className="text-zinc-400 text-sm">{missing.map((p: { first_name: string; last_name: string }) => `${p.first_name} ${p.last_name}`).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Player grid */}
        <h2 className="text-zinc-400 text-sm font-medium mb-4 uppercase tracking-wider">
          Today&apos;s Risk Overview — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        </h2>

        {players.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-medium text-white mb-1">No reports yet</p>
            <p className="text-sm">Upload GPS data or wait for players to submit surveys.</p>
            <Link href="/upload" className="mt-4 inline-block bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition">
              Upload GPS file
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map(p => (
              <Link key={p.player_id} href={`/player/${p.player_id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold group-hover:text-white">
                      {p.players?.first_name} {p.players?.last_name}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      #{p.players?.jersey_number} · {p.players?.position || 'Player'}
                    </p>
                  </div>
                  <RiskBadge color={p.risk_color} score={p.overall_risk_score} />
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">{p.primary_concern}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-600 capitalize">{p.data_tier?.replace('_', ' ')}</span>
                  <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition">View report →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
