import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const colors = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6' }

export default function GenderDonutChart({ data = {} }) {
  const rows = Array.isArray(data) ? data : Object.entries(data).map(([name, count]) => ({ name, count }))
  const total = rows.reduce((sum, item) => sum + Number(item.count || 0), 0)
  return (
    <div role="img" aria-label="Gender distribution chart">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <title>Gender distribution chart</title>
          <Pie data={rows} dataKey="count" nameKey="name" innerRadius={70} outerRadius={105}>
            {rows.map((entry) => <Cell aria-hidden="true" key={entry.name} fill={colors[String(entry.name).toLowerCase()] || '#64748b'} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700">{total}</text>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        {rows.map((item) => <span key={item.name} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: colors[String(item.name).toLowerCase()] || '#64748b' }} />{item.name}: {item.count}</span>)}
      </div>
    </div>
  )
}
