import { CalendarDays, Eye, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../lib/utils'

const depts = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Psychiatry', 'ENT', 'Ophthalmology', 'Oncology']

function BookingModal({ patients, onClose, onSaved }) {
  const [form, setForm] = useState({ patient_id: '', doctor_name: '', department: 'General', appointment_date: '', appointment_type: 'in-person', reason: '' })

  async function submit(event) {
    event.preventDefault()
    try {
      await api.post('/appointments', form)
      toast.success('Appointment booked')
      onSaved()
      onClose()
    } catch {
      toast.error('Unable to book appointment')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-2xl p-6" onSubmit={submit}>
        <div className="mb-5 flex justify-between">
          <h2 className="font-heading text-xl font-semibold">Book Appointment</h2>
          <button type="button" aria-label="Close appointment dialog" className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Patient
            <select className="input mt-1 w-full" required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
              <option value="">Select patient</option>
              {patients.map((p) => <option key={p.id || p.patient_id} value={p.patient_id || p.id}>{p.name} · {p.patient_id}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Doctor Name
            <input className="input mt-1 w-full" required value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
          </label>
          <label className="text-sm">
            Department
            <select className="input mt-1 w-full" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {depts.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Date & Time
            <input className="input mt-1 w-full" required type="datetime-local" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
          </label>
        </div>

        <div className="mt-4 flex gap-3">
          {['in-person', 'teleconsult'].map((type) => (
            <label key={type} className="input flex items-center gap-2">
              <input type="radio" checked={form.appointment_type === type} onChange={() => setForm({ ...form, appointment_type: type })} />
              {type}
            </label>
          ))}
        </div>

        <label className="mt-4 block text-sm">
          Reason
          <textarea className="input mt-1 min-h-24 w-full py-3" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Book Appointment</button>
        </div>
      </form>
    </div>
  )
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [modal, setModal] = useState(false)
  const [filters, setFilters] = useState({ date: '', status: 'All', doctor: '' })

  async function load() {
    const [a, p] = await Promise.allSettled([api.get('/appointments'), api.get('/patients')])
    if (a.status === 'fulfilled') setAppointments(a.value.data.items || a.value.data || [])
    if (p.status === 'fulfilled') setPatients(p.value.data.items || p.value.data || [])
  }

  useEffect(() => { load() }, [])

  const today = new Date().toISOString().slice(0, 10)
  const todays = appointments.filter((a) => String(a.appointment_date || '').startsWith(today))
  const filtered = useMemo(
    () => appointments.filter((a) => (!filters.date || String(a.appointment_date || '').startsWith(filters.date)) && (filters.status === 'All' || a.status === filters.status.toLowerCase()) && (!filters.doctor || String(a.doctor_name).toLowerCase().includes(filters.doctor.toLowerCase()))),
    [appointments, filters]
  )

  async function updateStatus(id, status) {
    try {
      await api.put(`/appointments/${id}/status`, { status })
      toast.success('Status updated')
      load()
    } catch {
      toast.error('Unable to update status')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="font-heading text-2xl font-bold">Appointments</h1>
          <span className="text-sm text-blue-400" aria-label={`${todays.length} appointments today`}>{todays.length} today</span>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}><Plus size={17} /> Book Appointment</button>
      </div>

      {todays.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {todays.map((a) => (
            <div key={a.id} className="card min-w-64 border-t-4 border-t-blue-500 p-4">
              <b>{a.patient_name || a.patient_id}</b>
              <p className="text-sm">{a.doctor_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(a.appointment_date, { timeStyle: 'short' })}</p>
              <StatusBadge status={a.appointment_type}>{a.appointment_type}</StatusBadge>
            </div>
          ))}
        </div>
      )}

      <div className="card flex flex-wrap gap-3 p-4">
        <input aria-label="Filter appointments by date" className="input" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <select aria-label="Filter appointments by status" className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          {['All', 'Scheduled', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <input className="input" placeholder="Doctor search" value={filters.doctor} onChange={(e) => setFilters({ ...filters, doctor: e.target.value })} />
      </div>

      {filtered.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-muted)' }}>
              <tr>
                <th className="p-4">Patient Name</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-4">{a.patient_name || a.patient_id}</td>
                  <td>{a.doctor_name}</td>
                  <td>{a.department}</td>
                  <td>{formatDate(a.appointment_date, { timeStyle: 'short' })}</td>
                  <td><StatusBadge status={a.appointment_type}>{a.appointment_type}</StatusBadge></td>
                  <td><StatusBadge status={a.status || 'scheduled'} /></td>
                  <td>
                    <div className="flex gap-2">
                      <select aria-label={`Update appointment status for ${a.patient_name || a.patient_id}`} className="input h-9" value="" onChange={(e) => e.target.value && updateStatus(a.id, e.target.value)}>
                        <option value="">Update</option>
                        {['scheduled', 'completed', 'cancelled'].filter((s) => s !== a.status).map((s) => <option key={s} value={s}>Mark {s}</option>)}
                      </select>
                      <button aria-label={`View appointment for ${a.patient_name || a.patient_id}`} className="icon-btn"><Eye size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<CalendarDays size={34} />} title="No appointments found" message="Book an appointment to start the schedule." />
      )}

      {modal && <BookingModal patients={patients} onClose={() => setModal(false)} onSaved={load} />}
    </div>
  )
}
