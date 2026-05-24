import { Activity, CalendarDays, CheckCircle2, ChevronRight, Clock, FileSearch, MessageSquare, Pill, Sparkles, Stethoscope, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSkeleton from '../components/LoadingSkeleton'
import AppointmentLineChart from '../components/charts/AppointmentLineChart'
import BloodGroupPieChart from '../components/charts/BloodGroupPieChart'
import { formatDate } from '../lib/utils'

const demoTrend = [{ date: 'Mon', count: 4 }, { date: 'Tue', count: 8 }, { date: 'Wed', count: 6 }, { date: 'Thu', count: 11 }, { date: 'Fri', count: 9 }, { date: 'Sat', count: 5 }, { date: 'Sun', count: 7 }]
const demoBlood = [{ blood_group: 'A+', count: 8 }, { blood_group: 'B+', count: 5 }, { blood_group: 'O+', count: 6 }, { blood_group: 'AB+', count: 2 }]

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState({})
  const [chart, setChart] = useState(demoTrend)
  const [blood, setBlood] = useState(demoBlood)
  const [appointments, setAppointments] = useState([])

  async function load() {
    setLoading(true)
    const [overviewRes, chartRes, bloodRes, appointmentsRes] = await Promise.allSettled([
      api.get('/analytics/overview'),
      api.get('/analytics/appointments-chart?days=7'),
      api.get('/analytics/patients-by-blood-group'),
      api.get('/appointments')
    ])
    if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data)
    if (chartRes.status === 'fulfilled') setChart(chartRes.value.data)
    if (bloodRes.status === 'fulfilled') setBlood(bloodRes.value.data)
    if (appointmentsRes.status === 'fulfilled') setAppointments(appointmentsRes.value.data.items || appointmentsRes.value.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  const actions = [
    ['AI Medical Chatbot', 'Symptom checker & Q&A', '/chatbot', MessageSquare, 'blue'],
    ['Report Analyzer', 'Upload & analyze reports', '/report-analyzer', FileSearch, 'purple'],
    ['Drug Interaction', 'Check medication safety', '/drug-checker', Pill, 'orange'],
    ['Clinical Support', 'Diagnosis assistance', '/clinical-support', Stethoscope, 'green']
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Hospital operations, appointments, and AI workflow activity at a glance.</p>
      </div>
      {loading ? <LoadingSkeleton type="card" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total Patients" value={overview.total_patients || 0} color="blue" icon={<Users size={22} />} trend={{ value: overview.patient_growth_percentage || 0, isPositive: true, label: 'vs last month' }} />
          <StatCard title="Today's Appointments" value={overview.today_appointments || 0} color="green" icon={<CalendarDays size={22} />} />
          <StatCard title="Scheduled" value={overview.scheduled || 0} color="purple" icon={<Clock size={22} />} />
          <StatCard title="Completed" value={overview.completed || 0} color="green" icon={<CheckCircle2 size={22} />} />
          <StatCard title="Bed Occupancy %" value={`${overview.bed_occupancy_rate || 72}%`} color="orange" icon={<Activity size={22} />} />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.9fr_1fr]">
        <section className="card p-5">
          <h2 className="font-heading text-lg font-semibold">Appointment Trends (Last 7 Days)</h2>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Daily hospital visit load for operational planning.</p>
          <AppointmentLineChart data={chart} />
        </section>
        <section className="card p-5">
          <h2 className="font-heading text-lg font-semibold">Blood Group Distribution</h2>
          <BloodGroupPieChart data={blood} />
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Recent Appointments</h2>
            <Link className="text-sm text-blue-400" to="/appointments">View All</Link>
          </div>
          {loading ? <LoadingSkeleton type="table" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{ color: 'var(--text-muted)' }}><tr><th className="py-3">Patient</th><th>Doctor</th><th>Department</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{appointments.slice(0, 5).map((appt, index) => <tr key={appt.id || index} className="border-t" style={{ borderColor: 'var(--border)' }}><td className="py-3">{appt.patient_name || appt.patient_id || 'Patient'}</td><td>{appt.doctor_name}</td><td>{appt.department}</td><td>{formatDate(appt.appointment_date)}</td><td><StatusBadge status={appt.status || 'scheduled'} /></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2"><Sparkles className="text-blue-400" size={20} /><h2 className="font-heading text-lg font-semibold">AI Features</h2></div>
          <div className="space-y-3">{actions.map(([title, subtitle, path, Icon, color]) => (
            <Link key={title} to={path} className="flex items-center gap-3 rounded-xl border p-4 transition hover:border-l-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <Icon size={22} className={`text-${color}-400`} /><div className="flex-1"><p className="font-medium">{title}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p></div><ChevronRight size={18} />
            </Link>
          ))}</div>
        </section>
      </div>
    </div>
  )
}
