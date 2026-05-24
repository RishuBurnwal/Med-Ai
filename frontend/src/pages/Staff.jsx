import { Plus, Search, UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modal, setModal] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      const res = await api.get(`/staff?${params}`)
      setStaff(res.data.staff || [])
    } catch { setStaff([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [search, roleFilter])

  const roleColors = {
    doctor: 'bg-blue-500/20 text-blue-400',
    nurse: 'bg-green-500/20 text-green-400',
    receptionist: 'bg-purple-500/20 text-purple-400',
    pharmacist: 'bg-orange-500/20 text-orange-400',
    lab_technician: 'bg-yellow-500/20 text-yellow-400',
    admin: 'bg-red-500/20 text-red-400',
    accountant: 'bg-teal-500/20 text-teal-400',
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Staff Management</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}>
          <Plus size={17} /> Add Staff
        </button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="input flex items-center gap-2">
          <Search size={16} />
          <input className="bg-transparent outline-none" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {['doctor','nurse','receptionist','pharmacist','lab_technician','admin','accountant'].map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? <LoadingSkeleton type="table" /> : !staff.length ? (
        <EmptyState icon={<UserCog size={34} />} title="No staff found" message="Add hospital staff to get started." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-muted)' }}>
              <tr><th className="p-4">Staff ID</th><th>Name</th><th>Email</th><th>Role</th><th>Specialization</th><th>Department</th><th>Experience</th><th>Phone</th></tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.staff_id}</td>
                  <td className="font-semibold">{s.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${roleColors[s.role] || 'bg-slate-500/20 text-slate-400'}`}>
                      {s.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.specialization || '-'}</td>
                  <td>{s.department_name || '-'}</td>
                  <td>{s.experience_years} yrs</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <StaffForm onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />}
    </div>
  )
}

function StaffForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: 'Staff@123',
    role: 'doctor', specialization: '', department_id: '',
    qualification: '', experience_years: 0, salary: 0,
  })
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data || [])).catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    try {
      await api.post('/staff', { ...form, department_id: form.department_id ? Number(form.department_id) : null })
      toast.success('Staff member added')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add staff')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4">
      <form className="card w-full max-w-2xl p-6" onSubmit={submit}>
        <h2 className="mb-5 font-heading text-xl font-semibold">Add Staff Member</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">Name *<input className="input mt-1 w-full" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
          <label className="text-sm">Email *<input className="input mt-1 w-full" required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
          <label className="text-sm">Phone *<input className="input mt-1 w-full" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></label>
          <label className="text-sm">Password<input className="input mt-1 w-full" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></label>
          <label className="text-sm">Role<select className="input mt-1 w-full" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            {['doctor','nurse','receptionist','pharmacist','lab_technician','admin','accountant'].map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select></label>
          <label className="text-sm">Specialization<input className="input mt-1 w-full" value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} /></label>
          <label className="text-sm">Department<select className="input mt-1 w-full" value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}>
            <option value="">None</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select></label>
          <label className="text-sm">Qualification<input className="input mt-1 w-full" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} /></label>
          <label className="text-sm">Experience (years)<input className="input mt-1 w-full" type="number" value={form.experience_years} onChange={e => setForm({...form, experience_years: Number(e.target.value)})} /></label>
          <label className="text-sm">Salary (₹)<input className="input mt-1 w-full" type="number" value={form.salary} onChange={e => setForm({...form, salary: Number(e.target.value)})} /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Add Staff</button>
        </div>
      </form>
    </div>
  )
}
