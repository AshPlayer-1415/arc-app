'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getMyPlan } from '@/lib/api'
import Link from 'next/link'

type Plan = {
  training_recommendation: string
  intensity_modifier: number
  volume_modifier: number
  priority_focuses: string[]
  recovery_actions: string[]
  load_guidance: string
  risk_color: string
  generated_at: string
}

const INTENSITY_LABELS: Record<string, string> = {
  '1.0': 'Full intensity — cleared to train normally',
  '0.9': 'Near full — minor precautions only',
  '0.8': 'Moderate reduction — 80% of planned load',
  '0.7': 'Significant reduction — 70% intensity',
  '0.6': 'Light session only — 60% intensity',
  '0.5': 'Very light — active recovery only',
}

function getIntensityLabel(mod: number): string {
  const key = mod.toFixed(1)
  return INTENSITY_LABELS[key] || `${Math.round(mod * 100)}% of planned intensity`
}

function PriorityCard({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="text-zinc-600 mt-0.5 shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PlayerPlan() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const p = await getMyPlan(session.access_token)
        setPlan(p)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  const riskBg: Record<string, string> = {
    RED: 'bg-red-500/10 border-red-500/30',
    ORANGE: 'bg-orange-500/10 border-orange-500/30',
    YELLOW: 'bg-yellow-500/10 border-yellow-500/30',
    GREEN: 'bg-green-500/10 border-green-500/30',
  }

  const riskText: Record<string, string> = {
    RED: 'text-red-400',
    ORANGE: 'text-orange-400',
    YELLOW: 'text-yellow-400',
    GREEN: 'text-green-400',
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <span className="text-black font-black text-xs">A</span>
          </div>
          <span className="text-white font-semibold">My Plan</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/report" className="text-sm text-zinc-400 hover:text-white transition">My Report</Link>
          <Link href="/survey" className="text-sm bg-white text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition">
            Check-in
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {!plan ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-white font-semibold mb-1">No plan generated yet</p>
            <p className="text-zinc-400 text-sm mb-6">Complete your daily check-in so the ARC engine can personalise your training plan.</p>
            <Link href="/survey" className="inline-block bg-white text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-zinc-100 transition text-sm">
              Start check-in →
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
                {plan.generated_at ? new Date(plan.generated_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Today'}
              </p>
              <h1 className="text-2xl font-bold text-white">Your Training Plan</h1>
            </div>

            {/* Recommendation banner */}
            <div className={`border rounded-xl p-5 ${riskBg[plan.risk_color] || 'bg-zinc-900 border-zinc-800'}`}>
              <p className={`font-bold text-lg mb-1 ${riskText[plan.risk_color] || 'text-white'}`}>
                {plan.training_recommendation}
              </p>
              {plan.load_guidance && (
                <p className="text-zinc-400 text-sm">{plan.load_guidance}</p>
              )}
            </div>

            {/* Load modifiers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-zinc-500 text-xs mb-1">Intensity Target</p>
                <p className="text-white font-bold text-2xl">{Math.round(plan.intensity_modifier * 100)}%</p>
                <p className="text-zinc-500 text-xs mt-1">of normal</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-zinc-500 text-xs mb-1">Volume Target</p>
                <p className="text-white font-bold text-2xl">{Math.round(plan.volume_modifier * 100)}%</p>
                <p className="text-zinc-500 text-xs mt-1">of normal</p>
              </div>
            </div>

            {/* Guidance label */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-zinc-400 text-sm">{getIntensityLabel(plan.intensity_modifier)}</p>
            </div>

            <PriorityCard icon="🎯" title="Priority Focuses" items={plan.priority_focuses} />
            <PriorityCard icon="🛌" title="Recovery Actions" items={plan.recovery_actions} />

            {/* Generated time */}
            {plan.generated_at && (
              <p className="text-center text-zinc-600 text-xs">
                Plan generated {new Date(plan.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
