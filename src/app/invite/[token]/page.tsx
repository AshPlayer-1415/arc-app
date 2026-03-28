'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getInviteInfo, acceptInvite } from '@/lib/api'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<{ team_name: string; player_name: string; jersey_number: number } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'info' | 'signup'>('info')

  useEffect(() => {
    getInviteInfo(token)
      .then(setInvite)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setAccepting(true); setError('')
    const supabase = createClient()

    // Sign up (or sign in if already has account)
    const { error: signUpErr } = await supabase.auth.signUp({ email, password })
    if (signUpErr && !signUpErr.message.includes('already')) {
      setError(signUpErr.message); setAccepting(false); return
    }

    const { data: { session }, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr || !session) {
      setError('Please confirm your email first, then sign in.'); setAccepting(false); return
    }

    try {
      await acceptInvite(token, session.access_token)
      router.push('/survey')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to accept invite')
      setAccepting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (error && !invite) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <a href="/login" className="text-white underline text-sm">Go to login</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-black text-sm">A</span>
            </div>
            <span className="text-white font-bold text-xl">ARC</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6">
            <p className="text-zinc-400 text-sm mb-1">You&apos;ve been invited to join</p>
            <p className="text-white font-bold text-lg">{invite?.team_name}</p>
            <div className="mt-3 pt-3 border-t border-zinc-700">
              <p className="text-zinc-300 text-sm">{invite?.player_name}</p>
              <p className="text-zinc-500 text-xs">Jersey #{invite?.jersey_number}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Your email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Choose a password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 8 characters"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition" />
          </div>
          <button type="submit" disabled={accepting}
            className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-100 transition disabled:opacity-50">
            {accepting ? 'Joining…' : 'Join team & create account'}
          </button>
        </form>
        <p className="text-center text-zinc-500 text-xs mt-4">Already have an account? <a href="/login" className="text-white underline">Sign in instead</a></p>
      </div>
    </div>
  )
}
