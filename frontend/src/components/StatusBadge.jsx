const colorMap = {
  scheduled: '#1d4ed8',
  completed: '#047857',
  cancelled: '#b91c1c',
  active: '#047857',
  inactive: '#334155',
  high: '#b91c1c',
  medium: '#b45309',
  low: '#047857',
  major: '#b91c1c',
  moderate: '#b45309',
  minor: '#a16207',
  'in-person': '#1d4ed8',
  teleconsult: '#6d28d9'
}

export default function StatusBadge({ status = 'active', children }) {
  const key = String(status).toLowerCase()
  const color = colorMap[key] || '#64748b'
  return (
    <span
      className="inline-flex items-center rounded-full border px-[10px] py-[3px] text-[11px] font-medium lowercase"
      style={{ color: 'white', borderColor: `${color}66`, background: color }}
    >
      {children || key}
    </span>
  )
}
