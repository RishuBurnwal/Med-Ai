import { CalendarDays, CheckCircle2, Clock, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { formatDate } from '../lib/utils'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    async function load() {
      const [statsRes, apptRes] = await Promise.allSettled([
        api.get('/analytics/doctor-stats'),
        api.get('/appointments?limit=10'),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data.items || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Doctor Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Your patient overview at a glance.</p>
      </div>

      {loading ? <LoadingSkeleton type="card" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Appointments" value={stats.total_appointments || 0} color="blue" icon={<CalendarDays size={22} />} />
          <StatCard title="Today's Appointments" value={stats.today_appointments || 0} color="green" icon={<Clock size={22} />} />
          <StatCard title="Completed" value={stats.completed || 0} color="green" icon={<CheckCircle2 size={22} />} />
          <StatCard title="Total Patients" value={stats.total_patients || 0} color="purple" icon={<Users size={22} />} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-heading text-lg font-semibold">Recent Patients</h2>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Patients you recently treated.</p>
          {!stats.recent_patients?.length ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No patients yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_patients.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="font-medium text-sm">{p.name || p.patient_id}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {p.blood_group || '-'} · {p.gender || '-'} · {p.age || '-'} yrs
                    </p>
                  </div>
                  <button
                    className="text-xs text-blue-400 hover:underline"
                    onClick={() => navigate(`/patients/${p.patient_id}`)}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-heading text-lg font-semibold">Upcoming Appointments</h2>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Scheduled appointments that need your attention.</p>
          {!stats.upcoming_appointments?.length ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {stats.upcoming_appointments.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{a.patient_id || 'Patient'}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.department} · {formatDate(a.appointment_date)}</p>
                  </div>
                  <StatusBadge status={a.status || 'scheduled'} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">All Appointments</h2>
          <button className="text-sm text-blue-400 hover:underline" onClick={() => navigate('/appointments')}>View All</button>
        </div>
        {loading ? <LoadingSkeleton type="table" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ color: 'var(--text-muted)' }}>
                <tr><th className="py-3">Patient</th><th>Department</th><th>Date</th><th>Type</th><th>Status</th></tr>
              </thead>
              <tbody>
                {appointments.slice(0, 5).map((a, i) => (
                  <tr key={a.id || i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3">{a.patient_id || 'Patient'}</td>
                    <td>{a.department}</td>
                    <td>{formatDate(a.appointment_date)}</td>
                    <td className="capitalize">{a.appointment_type}</td>
                    <td><StatusBadge status={a.status || 'scheduled'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
