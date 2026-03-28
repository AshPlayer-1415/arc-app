'use client'

export type PainSite = {
  id: string
  label: string
  cx: number
  cy: number
}

const SITES: PainSite[] = [
  { id: 'pain_right_hamstring', label: 'R. Hamstring', cx: 138, cy: 250 },
  { id: 'pain_left_hamstring',  label: 'L. Hamstring', cx: 162, cy: 250 },
  { id: 'pain_right_quad',      label: 'R. Quad',      cx: 132, cy: 200 },
  { id: 'pain_left_quad',       label: 'L. Quad',      cx: 168, cy: 200 },
  { id: 'pain_right_groin',     label: 'R. Groin',     cx: 135, cy: 180 },
  { id: 'pain_left_groin',      label: 'L. Groin',     cx: 165, cy: 180 },
  { id: 'pain_right_knee',      label: 'R. Knee',      cx: 132, cy: 270 },
  { id: 'pain_left_knee',       label: 'L. Knee',      cx: 168, cy: 270 },
  { id: 'pain_right_ankle',     label: 'R. Ankle',     cx: 133, cy: 330 },
  { id: 'pain_left_ankle',      label: 'L. Ankle',     cx: 167, cy: 330 },
  { id: 'pain_right_calf',      label: 'R. Calf',      cx: 135, cy: 300 },
  { id: 'pain_left_calf',       label: 'L. Calf',      cx: 165, cy: 300 },
  { id: 'pain_back',            label: 'Back',         cx: 150, cy: 160 },
  { id: 'pain_glutes',          label: 'Glutes',       cx: 150, cy: 195 },
  { id: 'pain_abs',             label: 'Abs',          cx: 150, cy: 150 },
  { id: 'pain_right_hip',       label: 'R. Hip',       cx: 130, cy: 168 },
  { id: 'pain_left_hip',        label: 'L. Hip',       cx: 170, cy: 168 },
]

const SEVERITY_COLORS = ['transparent', '#eab308', '#f97316', '#ef4444']
const SEVERITY_LABELS = ['None', 'Mild', 'Moderate', 'Severe']

type Props = {
  values: Record<string, number>
  onChange: (id: string, val: number) => void
  readOnly?: boolean
}

export default function BodyMap({ values, onChange, readOnly = false }: Props) {
  const cycle = (id: string) => {
    if (readOnly) return
    const cur = values[id] ?? 0
    onChange(id, (cur + 1) % 4)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-400">
        {readOnly ? 'Pain sites' : 'Tap a spot to cycle severity. Tap again to increase.'}
      </p>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap justify-center">
        {SEVERITY_LABELS.map((l, i) => (
          <span key={l} className="flex items-center gap-1 text-xs text-zinc-400">
            <span className="w-3 h-3 rounded-full border border-zinc-600"
              style={{ background: SEVERITY_COLORS[i] || '#27272a' }} />
            {l}
          </span>
        ))}
      </div>

      {/* SVG body silhouette */}
      <svg viewBox="60 50 180 320" width="220" height="350" className="select-none">
        {/* Simple body outline */}
        {/* Head */}
        <circle cx="150" cy="80" r="22" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
        {/* Torso */}
        <rect x="118" y="104" width="64" height="80" rx="8" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
        {/* Left arm */}
        <rect x="88" y="108" width="28" height="60" rx="10" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
        {/* Right arm */}
        <rect x="184" y="108" width="28" height="60" rx="10" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
        {/* Left leg */}
        <rect x="118" y="186" width="28" height="150" rx="10" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
        {/* Right leg */}
        <rect x="154" y="186" width="28" height="150" rx="10" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />

        {/* Pain dots */}
        {SITES.map((site) => {
          const val = values[site.id] ?? 0
          const color = val > 0 ? SEVERITY_COLORS[val] : '#3f3f46'
          const active = val > 0
          return (
            <g key={site.id} onClick={() => cycle(site.id)}
              className={readOnly ? '' : 'cursor-pointer'}>
              <circle
                cx={site.cx} cy={site.cy} r={active ? 9 : 7}
                fill={color}
                stroke={active ? color : '#52525b'}
                strokeWidth={active ? 2 : 1}
                opacity={0.9}
                className={active && !readOnly ? 'animate-pulse' : ''}
              />
              {active && (
                <text x={site.cx} y={site.cy + 4} textAnchor="middle"
                  fontSize="8" fill="white" fontWeight="bold">
                  {val}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Active sites list */}
      {Object.entries(values).filter(([, v]) => v > 0).length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {SITES.filter(s => (values[s.id] ?? 0) > 0).map(s => (
            <span key={s.id} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {s.label} — {SEVERITY_LABELS[values[s.id]]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
