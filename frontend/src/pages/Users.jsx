import { Key, Plus, RefreshCw, Search, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { formatDate } from '../lib/utils'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [resetModal, setResetModal] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      const res = await api.get(`/users?${params}`)
      setUsers(res.data.users || [])
    } catch { setUsers([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [search, roleFilter])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">User Management</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}>
          <Plus size={17} /> Add User
        </button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="input flex items-center gap-2">
          <Search size={16} />
          <input className="bg-transparent outline-none" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {['admin','doctor','patient','staff'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? <LoadingSkeleton type="table" /> : !users.length ? (
        <EmptyState icon={<Shield size={34} />} title="No users found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-muted)' }}>
              <tr><th className="p-4">ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{u.id}</td>
                  <td className="font-medium">{u.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                      u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      u.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' :
                      u.role === 'patient' ? 'bg-green-500/20 text-green-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(u.created_at)}</td>
                  <td>
                    <button
                      onClick={() => setResetModal(u)}
                      className="icon-btn h-8 w-8"
                      title="Reset password"
                    >
                      <Key size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <UserForm onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />}
      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
          onReset={() => { setResetModal(null); load() }}
        />
      )}
    </div>
  )
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

function ResetPasswordModal({ user, onClose, onReset }) {
  const [mode, setMode] = useState('random') // random or custom
  const [newPassword, setNewPassword] = useState(generateRandomPassword())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (mode === 'random') {
      setNewPassword(generateRandomPassword())
    }
  }, [mode])

  async function submit(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      await api.put(`/users/${user.id}`, { password: newPassword })
      toast.success(`Password reset for ${user.name}`)
      onReset()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-md p-6" onSubmit={submit}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
            <Key size={18} className="text-emerald-400" /> Reset Password
          </h2>
          <button type="button" className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4 rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
            user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
            user.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' :
            user.role === 'patient' ? 'bg-green-500/20 text-green-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>{user.role}</span>
        </div>

        <div className="mb-4 flex gap-2">
          <button type="button"
            className={`input flex-1 text-sm ${mode === 'random' ? 'border-emerald-500' : ''}`}
            onClick={() => setMode('random')}>
            <RefreshCw size={14} className="inline mr-1" /> Generate Random
          </button>
          <button type="button"
            className={`input flex-1 text-sm ${mode === 'custom' ? 'border-emerald-500' : ''}`}
            onClick={() => { setMode('custom'); setNewPassword('') }}>
            Set Custom
          </button>
        </div>

        <label className="block text-sm">
          {mode === 'random' ? 'Generated Password' : 'Custom Password'}
          <div className="mt-1 flex gap-2">
            <input className="input flex-1" type="text" required minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)} />
            {mode === 'random' && (
              <button type="button" className="icon-btn"
                onClick={() => setNewPassword(generateRandomPassword())}
                title="Regenerate">
                <RefreshCw size={14} />
              </button>
            )}
          </div>
          {mode === 'random' && newPassword && (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <button type="button" className="text-emerald-400 hover:underline"
                onClick={() => { navigator.clipboard.writeText(newPassword); toast.success('Copied!') }}>
                Click to copy</button> this password
            </p>
          )}
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex items-center gap-2" disabled={submitting}>
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </div>
  )
}

function UserForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: 'User@123', role: 'staff' })

  async function submit(e) {
    e.preventDefault()
    try {
      await api.post('/users', form)
      toast.success('User created')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-md p-6" onSubmit={submit}>
        <h2 className="mb-5 font-heading text-xl font-semibold">Create User</h2>
        <div className="space-y-4">
          <label className="text-sm">Name *<input className="input mt-1 w-full" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
          <label className="text-sm">Email *<input className="input mt-1 w-full" required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
          <label className="text-sm">Password<input className="input mt-1 w-full" type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></label>
          <label className="text-sm">Role<select className="input mt-1 w-full" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            {['admin','doctor','patient','staff'].map(r => <option key={r} value={r}>{r}</option>)}
          </select></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Create</button>
        </div>
      </form>
    </div>
  )
}
