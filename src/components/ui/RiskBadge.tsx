type Risk = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | string

const styles: Record<string, string> = {
  RED:    'bg-red-500/20 text-red-400 border-red-500/40',
  ORANGE: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  YELLOW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  GREEN:  'bg-green-500/20 text-green-400 border-green-500/40',
}

const dots: Record<string, string> = {
  RED: 'bg-red-400', ORANGE: 'bg-orange-400', YELLOW: 'bg-yellow-400', GREEN: 'bg-green-400',
}

export default function RiskBadge({ color, score }: { color: Risk; score?: number }) {
  const cls = styles[color] ?? 'bg-zinc-700 text-zinc-400 border-zinc-600'
  const dot = dots[color] ?? 'bg-zinc-500'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${color === 'RED' ? 'animate-pulse' : ''}`} />
      {color}{score !== undefined ? ` · ${Math.round(score)}` : ''}
    </span>
  )
}
