'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { invitePlayer } from '@/lib/api'
import Link from 'next/link'

type Player = {
  id: string
  first_name: string
  last_name: string
  jersey_number: number
  position: string
  email: string
  data_tier: string
  catapult_matched: boolean
  whoop_connected: boolean
  auth_user_id: string | null
}

type Invite = {
  id: string
  first_name: string
  last_name: string
  jersey_number: number
  position: string
  status: string
  invite_link: string
}

const POSITIONS = ['', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'Other']

export default function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [team, setTeam] = useState<{ name: string; id: string } | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New player form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jersey, setJersey] = useState('')
  const [position, setPosition] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setToken(session.access_token)

      const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).then(r => r.json()).catch(() => [])

      const firstTeam = Array.isArray(teamsRes) ? teamsRes[0] : null
      if (!firstTeam) { setLoading(false); return }
      setTeam(firstTeam)

      // Load roster
      const rosterRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${firstTeam.id}/roster`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).then(r => r.json()).catch(() => ({ players: [], pending_invites: [] }))

      setPlayers(rosterRes.players || [])
      setInvites(rosterRes.pending_invites || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!team) return
    setSending(true); setError(''); setSuccess('')
    try {
      const res = await invitePlayer(team.id, {
        first_name: firstName,
        last_name: lastName,
        jersey_number: parseInt(jersey),
        position,
      }, token)
      setSuccess(`Invite created for ${firstName} ${lastName}`)
      setInvites(prev => [...prev, res])
      setFirstName(''); setLastName(''); setJersey(''); setPosition('')
      setShowForm(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create invite')
    }
    setSending(false)
  }

  async function copyLink(link: string, id: string) {
    await navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white text-sm transition">← Dashboard</Link>
          <span className="text-zinc-700">|</span>
          <span className="text-white font-semibold">Roster — {team?.name}</span>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-sm bg-white text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition">
          {showForm ? 'Cancel' : '+ Add player'}
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Add player form */}
        {showForm && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Add new player</h3>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm mb-4">{error}</div>}
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">First name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Last name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Jersey #</label>
                  <input type="number" value={jersey} onChange={e => setJersey(e.target.value)} required min={1} max={99}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Position</label>
                  <select value={position} onChange={e => setPosition(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20">
                    {POSITIONS.map(p => <option key={p} value={p}>{p || '— select —'}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={sending}
                className="w-full bg-white text-black font-semibold py-2 rounded-lg hover:bg-zinc-100 transition disabled:opacity-50 text-sm">
                {sending ? 'Creating invite…' : 'Create invite link'}
              </button>
            </form>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm">{success}</div>
        )}

        {/* Active roster */}
        <div>
          <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
            Active Players ({players.length})
          </h2>
          {players.length === 0 ? (
            <div className="text-center py-8 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-zinc-500 text-sm">No players have joined yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                      {p.jersey_number}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.first_name} {p.last_name}</p>
                      <p className="text-zinc-500 text-xs">{p.position || 'Player'} · {p.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.catapult_matched && (
                      <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">GPS</span>
                    )}
                    {p.whoop_connected && (
                      <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Whoop</span>
                    )}
                    <span className="text-xs text-zinc-600 capitalize">{p.data_tier?.replace('_', ' ') || 'survey'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
              Pending Invites ({invites.length})
            </h2>
            <div className="space-y-2">
              {invites.map(inv => (
                <div key={inv.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-bold">
                      {inv.jersey_number}
                    </div>
                    <div>
                      <p className="text-zinc-300 text-sm font-medium">{inv.first_name} {inv.last_name}</p>
                      <p className="text-zinc-600 text-xs">{inv.position || 'Player'} · Awaiting signup</p>
                    </div>
                  </div>
                  <button onClick={() => copyLink(inv.invite_link, inv.id)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition">
                    {copiedId === inv.id ? '✓ Copied!' : 'Copy link'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {players.length === 0 && invites.length === 0 && !showForm && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-white font-semibold mb-1">Build your roster</p>
            <p className="text-zinc-400 text-sm mb-4">Add players and send them an invite link to join your team.</p>
            <button onClick={() => setShowForm(true)}
              className="inline-block bg-white text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-zinc-100 transition text-sm">
              Add first player
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
