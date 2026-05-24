import { TrendingDown, TrendingUp } from 'lucide-react'

const colors = {
  blue: 'var(--accent-blue)',
  green: 'var(--accent-green)',
  red: 'var(--accent-red)',
  orange: 'var(--accent-orange)',
  purple: 'var(--accent-purple)'
}

export default function StatCard({ title, value, icon, color = 'blue', trend }) {
  const accent = colors[color] || colors.blue
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5px]" style={{ color: 'var(--text-muted)' }}>{title}</p>
          <p className="mt-3 font-heading text-[28px] font-bold leading-none">{value ?? 0}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-[10px]" style={{ color: accent, background: `${accent}26` }}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: trend.isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          <TrendIcon size={14} />
          <span>{Math.abs(trend.value)}%</span>
          <span style={{ color: 'var(--text-muted)' }}>{trend.label}</span>
        </div>
      )}
    </div>
  )
}
