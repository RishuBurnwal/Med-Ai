import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function TooltipCard({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-lg border p-3 text-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}><b>{label}</b><p>{payload[0].value} appointments</p></div>
}

export default function AppointmentLineChart({ data = [] }) {
  return (
    <div role="img" aria-label="Appointments per day chart">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <title>Appointments per day chart</title>
        <defs>
          <linearGradient id="appointmentBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
        <YAxis stroke="var(--text-muted)" fontSize={12} />
        <Tooltip content={<TooltipCard />} />
        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#appointmentBlue)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
