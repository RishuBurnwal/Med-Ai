import { Building2, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/departments')
      setDepartments(res.data || [])
    } catch { setDepartments([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Departments</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}>
          <Plus size={17} /> Add Department
        </button>
      </div>

      {loading ? <LoadingSkeleton type="table" /> : !departments.length ? (
        <EmptyState icon={<Building2 size={34} />} title="No departments" message="Add hospital departments to organize care." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading font-semibold">{d.name}</h3>
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400">{d.staff_count || 0} staff</span>
              </div>
              {d.head_doctor && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Head: <span className="font-medium text-blue-400">{d.head_doctor}</span></p>}
              {d.description && <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{d.description}</p>}
              <div className="mt-3 flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {d.location && <span>📍 {d.location}</span>}
                {d.phone && <span>📞 {d.phone}</span>}
                {d.ward_count > 0 && <span>🏥 {d.ward_count} wards</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <DepartmentForm onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />}
    </div>
  )
}

function DepartmentForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', head_doctor: '', location: '', phone: '' })

  async function submit(e) {
    e.preventDefault()
    try {
      await api.post('/departments', form)
      toast.success('Department created')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create department')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-lg p-6" onSubmit={submit}>
        <h2 className="mb-5 font-heading text-xl font-semibold">Add Department</h2>
        <div className="space-y-4">
          <label className="text-sm">Name *<input className="input mt-1 w-full" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
          <label className="text-sm">Description<textarea className="input mt-1 min-h-20 w-full py-3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
          <label className="text-sm">Head Doctor<input className="input mt-1 w-full" value={form.head_doctor} onChange={e => setForm({...form, head_doctor: e.target.value})} /></label>
          <label className="text-sm">Location<input className="input mt-1 w-full" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></label>
          <label className="text-sm">Phone<input className="input mt-1 w-full" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Create</button>
        </div>
      </form>
    </div>
  )
}
