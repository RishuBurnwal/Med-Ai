import { CalendarDays, CheckCircle2, Clock, Download, Users, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../services/api'
import StatCard from '../components/StatCard'
import AppointmentLineChart from '../components/charts/AppointmentLineChart'
import BloodGroupPieChart from '../components/charts/BloodGroupPieChart'
import GenderDonutChart from '../components/charts/GenderDonutChart'
import DepartmentBarChart from '../components/charts/DepartmentBarChart'

const demoChart = [{ date: 'Mon', count: 4 }, { date: 'Tue', count: 7 }, { date: 'Wed', count: 6 }, { date: 'Thu', count: 10 }, { date: 'Fri', count: 8 }]
const demoBlood = [{ blood_group: 'A+', count: 8 }, { blood_group: 'B+', count: 5 }, { blood_group: 'O+', count: 6 }]
const demoGender = { male: 10, female: 8, other: 2 }
const demoDepartments = [{ department: 'General', count: 9 }, { department: 'Cardiology', count: 6 }, { department: 'Neurology', count: 4 }]

export default function Analytics() {
  const [days, setDays] = useState(7)
  const [updated, setUpdated] = useState(new Date())
  const [overview, setOverview] = useState({})
  const [chart, setChart] = useState(demoChart)
  const [blood, setBlood] = useState(demoBlood)
  const [gender, setGender] = useState(demoGender)
  const [departments, setDepartments] = useState(demoDepartments)

  async function load(range = days) {
    const [o, c, b, g, d] = await Promise.allSettled([
      api.get('/analytics/overview'),
      api.get(`/analytics/appointments-chart?days=${range}`),
      api.get('/analytics/patients-by-blood-group'),
      api.get('/analytics/patients-by-gender'),
      api.get('/analytics/departments')
    ])
    if (o.status === 'fulfilled') setOverview(o.value.data)
    if (c.status === 'fulfilled') setChart(c.value.data)
    if (b.status === 'fulfilled') setBlood(b.value.data)
    if (g.status === 'fulfilled') setGender(g.value.data)
    if (d.status === 'fulfilled') setDepartments(d.value.data)
    setUpdated(new Date())
  }

  useEffect(() => { load(days) }, [days])
  function exportCsv() {
    const rows = ['date,count', ...chart.map((r) => `${r.date},${r.count}`)]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `medai-analytics-${days}-days.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-heading text-2xl font-bold">Analytics</h1><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last updated {Math.max(0, Math.round((Date.now() - updated.getTime()) / 1000))} seconds ago</p></div>
        <div className="flex gap-2">{[7, 30, 90].map((range) => <button key={range} className={`input ${days === range ? 'border-blue-500 bg-blue-500/15 text-blue-400' : ''}`} onClick={() => setDays(range)}>{range} Days</button>)}<button className="input flex items-center gap-2 px-4" onClick={exportCsv}><Download size={16} /> Export CSV</button></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Patients" value={overview.total_patients || 0} icon={<Users size={21} />} color="blue" />
        <StatCard title="Total Appointments" value={overview.total_appointments || 0} icon={<CalendarDays size={21} />} color="purple" />
        <StatCard title="Scheduled" value={overview.scheduled || 0} icon={<Clock size={21} />} color="orange" />
        <StatCard title="Completed" value={overview.completed || 0} icon={<CheckCircle2 size={21} />} color="green" />
        <StatCard title="Cancelled" value={overview.cancelled || 0} icon={<XCircle size={21} />} color="red" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5"><h2 className="font-heading text-lg font-semibold">Appointments per day</h2><AppointmentLineChart data={chart} /></section>
        <section className="card p-5"><h2 className="font-heading text-lg font-semibold">Blood group distribution</h2><BloodGroupPieChart data={blood} /></section>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-5"><h2 className="font-heading text-lg font-semibold">Gender distribution</h2><GenderDonutChart data={gender} /></section>
        <section className="card p-5"><h2 className="font-heading text-lg font-semibold">Top departments</h2><DepartmentBarChart data={departments} /></section>
      </div>
    </div>
  )
}
