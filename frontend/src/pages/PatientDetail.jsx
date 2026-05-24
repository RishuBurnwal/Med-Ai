import { ArrowLeft, FileText, Save, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { formatDate, initials } from '../lib/utils'

export default function PatientDetail() {
  const { id } = useParams()
  const [tab, setTab] = useState('overview')
  const [patient, setPatient] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [reports, setReports] = useState([])
  const [form, setForm] = useState(null)

  async function load() {
    try {
      const res = await api.get(`/patients/${id}`)
      setPatient(res.data)
      setForm(res.data)
    } catch { toast.error('Unable to load patient') }
    const [appt, rep] = await Promise.allSettled([api.get(`/appointments?patient_id=${id}`), api.get(`/ai/reports/${id}`)])
    if (appt.status === 'fulfilled') setAppointments(appt.value.data.items || appt.value.data || [])
    if (rep.status === 'fulfilled') setReports(rep.value.data || [])
  }
  useEffect(() => { load() }, [id])
  if (!patient) return <EmptyState icon={<UserRound size={34} />} title="Patient record unavailable" message="The selected patient could not be loaded." />

  const lists = [
    ['Medical History', patient.medical_history || [], 'bg-blue-500/15 text-blue-300'],
    ['Allergies', patient.allergies || [], 'bg-red-500/15 text-red-300'],
    ['Current Medications', patient.current_medications || [], 'bg-emerald-500/15 text-emerald-300']
  ]
  async function update() {
    try {
      await api.put(`/patients/${id}`, form)
      toast.success('Patient updated')
      load()
    } catch { toast.error('Unable to update patient') }
  }

  return (
    <div className="space-y-5">
      <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-blue-400"><ArrowLeft size={16} /> Back to Patients</Link>
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 font-heading text-xl font-bold text-white">{initials(patient.name)}</div><div><h1 className="font-heading text-2xl font-bold">{patient.name}</h1><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded bg-blue-500/15 px-2 py-1 font-mono text-xs text-blue-300">{patient.patient_id || patient.id}</span><span>{patient.age} yrs</span><span className="capitalize">{patient.gender}</span><StatusBadge>{patient.blood_group}</StatusBadge></div></div></div>
        <div className="text-right"><button className="btn-primary" onClick={() => setTab('edit')}>Edit Patient</button><p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Registered {formatDate(patient.created_at)}</p></div>
      </section>
      <div className="flex flex-wrap gap-2">{['overview', 'appointments', 'reports', 'edit'].map((item) => <button key={item} className={`input capitalize ${tab === item ? 'border-blue-500 text-blue-400' : ''}`} onClick={() => setTab(item)}>{item === 'reports' ? 'AI Reports' : item}</button>)}</div>
      {tab === 'overview' && <div className="grid gap-5 lg:grid-cols-2"><div className="card p-5"><h2 className="font-heading text-lg font-semibold">Contact Information</h2><p className="mt-4">Phone: {patient.phone}</p><p>Email: {patient.email || 'Not recorded'}</p><p>Address: {patient.address}</p></div><div className="card p-5"><h2 className="font-heading text-lg font-semibold">Emergency Contact</h2><p className="mt-4">{patient.emergency_contact || 'Not recorded'}</p></div><div className="card p-5 lg:col-span-2"><h2 className="font-heading text-lg font-semibold">Medical Summary</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{lists.map(([title, values, cls]) => <div key={title}><p className="mb-2 text-sm" style={{ color: 'var(--text-muted)' }}>{title}</p><div className="flex flex-wrap gap-2">{values.length ? values.map((v) => <span key={v} className={`rounded-full px-3 py-1 text-xs ${cls}`}>{v}</span>) : <span style={{ color: 'var(--text-muted)' }}>None recorded</span>}</div></div>)}</div></div></div>}
      {tab === 'appointments' && <div className="card p-5">{appointments.length ? appointments.map((a) => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3" style={{ borderColor: 'var(--border)' }}><div><b>{a.doctor_name}</b><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.department} · {formatDate(a.appointment_date, { timeStyle: 'short' })}</p></div><div className="flex gap-2"><StatusBadge status={a.appointment_type}>{a.appointment_type}</StatusBadge><StatusBadge status={a.status} /></div></div>) : <EmptyState icon={<UserRound size={32} />} title="No appointments" message="This patient has no appointments on record." />}</div>}
      {tab === 'reports' && <div className="space-y-3">{reports.length ? reports.map((r, index) => <details key={index} className="card p-4"><summary className="cursor-pointer"><StatusBadge>{r.analysis_type}</StatusBadge> <span className="ml-2">{formatDate(r.created_at)}</span><p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{String(r.analysis || '').slice(0, 100)}</p></summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-sm" style={{ background: 'var(--bg-secondary)' }}>{r.analysis}</pre></details>) : <EmptyState icon={<FileText size={32} />} title="No AI reports" message="Uploaded report analyses will appear here." />}</div>}
      {tab === 'edit' && form && <div className="card p-5"><div className="grid gap-4 md:grid-cols-2">{['name', 'age', 'phone', 'email', 'address', 'emergency_contact'].map((key) => <label key={key} className="text-sm capitalize">{key.replaceAll('_', ' ')}<input className="input mt-1 w-full" value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div><button className="btn-primary mt-5 flex items-center gap-2" onClick={update}><Save size={16} /> Update Patient</button></div>}
    </div>
  )
}
