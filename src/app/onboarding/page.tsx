'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const SPORTS = ['Soccer / Football', 'Basketball', 'Rugby', 'American Football', 'Baseball', 'Tennis', 'Swimming', 'Track & Field', 'Cycling', 'CrossFit', 'Gym / Weightlifting', 'Other']

const BODY_PARTS = [
  { id: 'right_hamstring', label: 'Right Hamstring' },
  { id: 'left_hamstring', label: 'Left Hamstring' },
  { id: 'right_quad', label: 'Right Quad' },
  { id: 'left_quad', label: 'Left Quad' },
  { id: 'right_groin', label: 'Right Groin' },
  { id: 'left_groin', label: 'Left Groin' },
  { id: 'right_knee', label: 'Right Knee' },
  { id: 'left_knee', label: 'Left Knee' },
  { id: 'right_ankle', label: 'Right Ankle' },
  { id: 'left_ankle', label: 'Left Ankle' },
  { id: 'right_calf', label: 'Right Calf' },
  { id: 'left_calf', label: 'Left Calf' },
  { id: 'lower_back', label: 'Lower Back' },
  { id: 'upper_back', label: 'Upper Back' },
  { id: 'right_shoulder', label: 'Right Shoulder' },
  { id: 'left_shoulder', label: 'Left Shoulder' },
  { id: 'right_hip', label: 'Right Hip' },
  { id: 'left_hip', label: 'Left Hip' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'neck', label: 'Neck' },
  { id: 'abs_core', label: 'Abs / Core' },
]

const INJURY_TYPES = ['Strain', 'Sprain', 'Tear', 'Fracture', 'Tendinitis', 'Bursitis', 'Contusion', 'Dislocation', 'Other']

type PastInjury = { body_part: string; type: string; year: number; games_missed: number }

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? 'bg-white' : i === step ? 'bg-white/60' : 'bg-zinc-800'}`} />
      ))}
    </div>
  )
}

function TagButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${selected ? 'bg-white text-black border-transparent' : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
      {label}
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 0 — Basic info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [sport, setSport] = useState('')
  const [dominantFoot, setDominantFoot] = useState('')

  // Step 1 — Medical & injury history
  const [medicalHistory, setMedicalHistory] = useState('')
  const [injuries, setInjuries] = useState<PastInjury[]>([])
  const [addingInjury, setAddingInjury] = useState(false)
  const [newInjury, setNewInjury] = useState<PastInjury>({ body_part: '', type: '', year: new Date().getFullYear(), games_missed: 0 })

  // Step 2 — Risk areas & goals
  const [weakAreas, setWeakAreas] = useState<string[]>([])
  const [concernParts, setConcernParts] = useState<string[]>([])
  const [improvementGoals, setImprovementGoals] = useState('')

  // Computed BMI
  const bmi = heightCm && weightKg
    ? (parseFloat(weightKg) / ((parseFloat(heightCm) / 100) ** 2)).toFixed(1)
    : null

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)

      // Pre-fill name from auth user metadata if available
      const user = session.user
      if (user.user_metadata?.full_name) {
        const parts = user.user_metadata.full_name.split(' ')
        setFirstName(parts[0] || '')
        setLastName(parts.slice(1).join(' ') || '')
      }
    }
    load()
  }, [router])

  function toggleBodyPart(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  function addInjury() {
    if (!newInjury.body_part || !newInjury.type) return
    setInjuries(prev => [...prev, newInjury])
    setNewInjury({ body_part: '', type: '', year: new Date().getFullYear(), games_missed: 0 })
    setAddingInjury(false)
  }

  async function handleSubmit() {
    setSubmitting(true); setError('')
    try {
      const body: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        sport,
        dominant_foot: dominantFoot || null,
        medical_history: medicalHistory || null,
        injury_history: injuries,
        weak_areas: weakAreas,
        concern_body_parts: concernParts,
        improvement_goals: improvementGoals || null,
        profile_completed: true,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Update failed')
      }

      // Done — go to their report
      router.push('/report')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
    setSubmitting(false)
  }

  const TOTAL_STEPS = 3

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <span className="text-black font-black text-xs">A</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">ARC</span>
        </div>

        <StepIndicator step={step} total={TOTAL_STEPS} />

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-6">{error}</div>}

        {/* ─── STEP 0: Basic Info ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Let's set up your profile</h1>
              <p className="text-zinc-400 text-sm mt-1">This helps ARC personalise your injury risk assessment.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">First name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Last name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Date of birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Height (cm)</label>
                <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="e.g. 178"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Weight (kg)</label>
                <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="e.g. 75"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
            </div>

            {bmi && (
              <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
                <span className="text-zinc-400">BMI: </span>
                <span className="text-white font-semibold">{bmi}</span>
                <span className="text-zinc-500 ml-2">{parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Healthy' : parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'}</span>
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-400 mb-2">Primary sport</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <TagButton key={s} label={s} selected={sport === s} onClick={() => setSport(s)} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-2">Dominant foot / hand</label>
              <div className="flex gap-2">
                {['Left', 'Right', 'Both', 'N/A'].map(f => (
                  <TagButton key={f} label={f} selected={dominantFoot === f.toLowerCase()} onClick={() => setDominantFoot(f.toLowerCase())} />
                ))}
              </div>
            </div>

            <button onClick={() => setStep(1)}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-100 transition text-sm">
              Continue →
            </button>
          </div>
        )}

        {/* ─── STEP 1: Medical & Injury History ──────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Medical & injury history</h1>
              <p className="text-zinc-400 text-sm mt-1">This stays private. It helps ARC understand your baseline risk.</p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Any ongoing medical conditions? <span className="text-zinc-600">(optional)</span></label>
              <textarea value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} rows={3}
                placeholder="e.g. Mild asthma, managed with inhaler. Hay fever during spring..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 resize-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-zinc-400">Past injuries <span className="text-zinc-600">(optional)</span></label>
                <button type="button" onClick={() => setAddingInjury(true)}
                  className="text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition">
                  + Add injury
                </button>
              </div>

              {injuries.length > 0 && (
                <div className="space-y-2 mb-3">
                  {injuries.map((inj, i) => (
                    <div key={i} className="bg-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm capitalize">{inj.body_part.replace(/_/g, ' ')} — {inj.type}</p>
                        <p className="text-zinc-500 text-xs">{inj.year} · {inj.games_missed} sessions missed</p>
                      </div>
                      <button onClick={() => setInjuries(prev => prev.filter((_, j) => j !== i))}
                        className="text-zinc-600 hover:text-red-400 text-sm ml-2">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {addingInjury && (
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Body part</label>
                      <select value={newInjury.body_part} onChange={e => setNewInjury(p => ({ ...p, body_part: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none">
                        <option value="">Select…</option>
                        {BODY_PARTS.map(bp => <option key={bp.id} value={bp.id}>{bp.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Type</label>
                      <select value={newInjury.type} onChange={e => setNewInjury(p => ({ ...p, type: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none">
                        <option value="">Select…</option>
                        {INJURY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Year</label>
                      <input type="number" value={newInjury.year} onChange={e => setNewInjury(p => ({ ...p, year: parseInt(e.target.value) }))} min={2000} max={new Date().getFullYear()}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Sessions missed</label>
                      <input type="number" value={newInjury.games_missed} onChange={e => setNewInjury(p => ({ ...p, games_missed: parseInt(e.target.value) }))} min={0}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addInjury} className="flex-1 bg-white text-black font-semibold py-2 rounded-lg text-sm hover:bg-zinc-100 transition">Add</button>
                    <button onClick={() => setAddingInjury(false)} className="flex-1 bg-zinc-800 text-zinc-300 font-semibold py-2 rounded-lg text-sm hover:bg-zinc-700 transition">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 bg-zinc-800 text-white font-semibold py-3 rounded-lg hover:bg-zinc-700 transition text-sm">← Back</button>
              <button onClick={() => setStep(2)} className="flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-100 transition text-sm">Continue →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Risk areas & goals ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Your risk profile</h1>
              <p className="text-zinc-400 text-sm mt-1">Tell ARC where to focus. This directly shapes your risk model.</p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Which areas feel weaker or less conditioned?</label>
              <p className="text-zinc-600 text-xs mb-3">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {BODY_PARTS.map(bp => (
                  <TagButton key={bp.id} label={bp.label}
                    selected={weakAreas.includes(bp.id)}
                    onClick={() => toggleBodyPart(bp.id, weakAreas, setWeakAreas)} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Which body parts are you most concerned about getting injured?</label>
              <p className="text-zinc-600 text-xs mb-3">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {BODY_PARTS.map(bp => (
                  <TagButton key={bp.id} label={bp.label}
                    selected={concernParts.includes(bp.id)}
                    onClick={() => toggleBodyPart(bp.id, concernParts, setConcernParts)} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">What are your performance or injury prevention goals? <span className="text-zinc-600">(optional)</span></label>
              <textarea value={improvementGoals} onChange={e => setImprovementGoals(e.target.value)} rows={3}
                placeholder="e.g. Strengthen my right hamstring after last year's strain. Improve sprint recovery time. Avoid any knee issues this season..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 text-white font-semibold py-3 rounded-lg hover:bg-zinc-700 transition text-sm">← Back</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-100 transition disabled:opacity-50 text-sm">
                {submitting ? 'Saving…' : 'Complete setup →'}
              </button>
            </div>

            <p className="text-center text-zinc-600 text-xs">You can always update this in your profile settings later.</p>
          </div>
        )}
      </div>
    </div>
  )
}
