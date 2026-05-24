import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export default function BloodGroupPieChart({ data = [] }) {
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  return (
    <div role="img" aria-label="Blood group distribution chart">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <title>Blood group distribution chart</title>
          <Pie data={data} dataKey="count" nameKey="blood_group" innerRadius={58} outerRadius={92} paddingAngle={3}>
            {data.map((entry, index) => <Cell aria-hidden="true" key={entry.blood_group || index} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700">{total}</text>
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.map((item, index) => (
          <div key={item.blood_group} className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />
            {item.blood_group}: {item.count}
          </div>
        ))}
      </div>
    </div>
  )
}
