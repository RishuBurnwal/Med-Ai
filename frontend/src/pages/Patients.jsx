import { Edit, Eye, Plus, Search, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../lib/utils'

const blank = { name: '', age: '', gender: 'male', blood_group: 'A+', phone: '', email: '', address: '', emergency_contact: '', medical_history: [], allergies: [], current_medications: [] }

function TagInput({ value, onChange, placeholder }) {
  const [text, setText] = useState('')
  function add() {
    if (!text.trim()) return
    onChange([...(value || []), text.trim()])
    setText('')
  }
  return <div className="input flex min-h-[44px] flex-wrap items-center gap-2 py-2">{(value || []).map((tag) => <span className="chip" key={tag}>{tag}<button type="button" onClick={() => onChange(value.filter((item) => item !== tag))}>×</button></span>)}<input className="min-w-[160px] flex-1 bg-transparent outline-none" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } if (e.key === 'Backspace' && !text && value?.length) onChange(value.slice(0, -1)) }} /></div>
}

function PatientForm({ initial = blank, onSubmit, onClose }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  function set(key, value) { setForm((current) => ({ ...current, [key]: value })) }
  function submit(event) {
    event.preventDefault()
    const next = {}
    ;['name', 'age', 'phone', 'address', 'emergency_contact'].forEach((key) => { if (!form[key]) next[key] = 'Required' })
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit({ ...form, age: Number(form.age) })
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4">
      <form className="card w-full max-w-4xl p-6" onSubmit={submit}>
        <div className="mb-5 flex items-center justify-between"><h2 className="font-heading text-xl font-semibold">Register New Patient</h2><button type="button" aria-label="Close patient registration dialog" className="icon-btn" onClick={onClose}><X size={16} /></button></div>
        <div className="grid gap-4 md:grid-cols-2">
          {['name', 'age', 'phone', 'email', 'address', 'emergency_contact'].map((key) => <label key={key} className="text-sm capitalize">{key.replaceAll('_', ' ')}{['name', 'age', 'phone', 'address', 'emergency_contact'].includes(key) && '*'}<input className="input mt-1 w-full" value={form[key] || ''} onChange={(e) => set(key, e.target.value)} />{errors[key] && <p className="mt-1 text-xs text-red-400">{errors[key]}</p>}</label>)}
          <label className="text-sm">Gender<select className="input mt-1 w-full" value={form.gender} onChange={(e) => set('gender', e.target.value)}><option>male</option><option>female</option><option>other</option></select></label>
          <label className="text-sm">Blood Group<select className="input mt-1 w-full" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => <option key={g}>{g}</option>)}</select></label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm">Medical History<TagInput value={form.medical_history} onChange={(v) => set('medical_history', v)} placeholder="Add history" /></label>
          <label className="text-sm">Allergies<TagInput value={form.allergies} onChange={(v) => set('allergies', v)} placeholder="Add allergy" /></label>
          <label className="text-sm">Current Medications<TagInput value={form.current_medications} onChange={(v) => set('current_medications', v)} placeholder="Add medication" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" className="input px-4" onClick={onClose}>Cancel</button><button className="btn-primary">Register Patient</button></div>
      </form>
    </div>
  )
}

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [query, setQuery] = useState('')
  const [blood, setBlood] = useState('All')
  const [gender, setGender] = useState('All')
  const [modal, setModal] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  async function load(nextPage = page) {
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '10' })
      if (query) params.set('search', query)
      const res = await api.get(`/patients?${params.toString()}`)
      setPatients(res.data.items || res.data || [])
      setTotal(res.data.total || (res.data.items || res.data || []).length)
    } catch { setPatients([]) }
  }
  useEffect(() => { load(page) }, [page])
  useEffect(() => { const id = setTimeout(() => { setPage(1); load(1) }, 250); return () => clearTimeout(id) }, [query])
  const filtered = useMemo(() => patients.filter((p) => (!query || `${p.name} ${p.patient_id}`.toLowerCase().includes(query.toLowerCase())) && (blood === 'All' || p.blood_group === blood) && (gender === 'All' || p.gender === gender.toLowerCase())), [patients, query, blood, gender])

  async function create(payload) {
    try {
      await api.post('/patients', payload)
      toast.success('Patient registered')
      setModal(false)
      load()
    } catch { toast.error('Unable to register patient') }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-baseline gap-2"><h1 className="font-heading text-2xl font-bold">Patients</h1><span className="text-sm text-blue-400" aria-label={`${filtered.length} patients shown`}>{filtered.length}</span></div><div className="flex gap-3"><div className="input flex items-center gap-2"><Search size={16} /><input className="bg-transparent outline-none" placeholder="Search by name or ID..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}><Plus size={17} /> Add Patient</button></div></div>
      <div className="card flex flex-wrap gap-3 p-4"><label className="sr-only" htmlFor="blood-filter">Filter by blood group</label><select id="blood-filter" aria-label="Filter by blood group" className="input" value={blood} onChange={(e) => setBlood(e.target.value)}>{['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => <option key={g}>{g}</option>)}</select><label className="sr-only" htmlFor="gender-filter">Filter by gender</label><select id="gender-filter" aria-label="Filter by gender" className="input" value={gender} onChange={(e) => setGender(e.target.value)}>{['All', 'Male', 'Female', 'Other'].map((g) => <option key={g}>{g}</option>)}</select>{(blood !== 'All' || gender !== 'All') && <button className="text-sm text-blue-400" onClick={() => { setBlood('All'); setGender('All') }}>Clear Filters</button>}</div>
      {!filtered.length ? <EmptyState icon={<Users size={34} />} title="No patients found" message="Register a patient to start building the clinical record." action={<button className="btn-primary" onClick={() => setModal(true)}>Add your first patient</button>} /> : <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead style={{ color: 'var(--text-muted)' }}><tr><th className="p-4">Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Blood Group</th><th>Phone</th><th>Registered Date</th><th>Actions</th></tr></thead><tbody>{filtered.map((p) => <tr key={p.id || p.patient_id} className="border-t hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}><td className="p-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{p.patient_id || p.id}</td><td className="font-semibold">{p.name}</td><td>{p.age}</td><td className="capitalize">{p.gender}</td><td><StatusBadge status="active">{p.blood_group}</StatusBadge></td><td>{p.phone}</td><td>{formatDate(p.created_at)}</td><td><div className="flex gap-2"><Link aria-label={`View patient ${p.name}`} className="icon-btn" to={`/patients/${p.id || p.patient_id}`}><Eye size={16} /></Link><button aria-label={`Edit patient ${p.name}`} className="icon-btn"><Edit size={16} /></button></div></td></tr>)}</tbody></table><div className="flex items-center justify-between border-t p-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}><span>Showing {(page - 1) * 10 + 1}-{(page - 1) * 10 + filtered.length} of {total} patients</span><div className="flex gap-2"><button className="input px-3" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button className="input px-3" disabled={page * 10 >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div></div></div>}
      {modal && <PatientForm onSubmit={create} onClose={() => setModal(false)} />}
    </div>
  )
}
