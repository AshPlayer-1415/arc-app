'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'coach' | 'player'>('coach')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
          <span className="text-green-400 text-xl">✓</span>
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Check your email</h2>
        <p className="text-zinc-400 text-sm">We sent a confirmation link to <span className="text-white">{email}</span>. Click it to activate your account, then sign in.</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-white underline">Back to sign in</Link>
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
            <span className="text-white font-bold text-xl tracking-tight">ARC</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-zinc-400 text-sm mt-1">Join ARC as a coach or athlete</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-lg">
            {(['coach', 'player'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`py-2 rounded-md text-sm font-medium transition capitalize ${role === r ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
                {r === 'coach' ? '🎯 Coach' : '🏃 Athlete'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 8 characters"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition" />
          </div>

          {role === 'player' && (
            <p className="text-xs text-zinc-500 bg-zinc-900 rounded-lg p-3">
              💡 If your coach sent you an invite link, use that instead — it will automatically link you to your team.
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-100 transition disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
