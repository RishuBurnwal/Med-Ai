import { CheckCircle2, Eye, EyeOff, Loader2, Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from './services/api'
import { useAuth } from './App.jsx'

export default function Settings() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    api.get('/auth/profile')
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function changePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setChanging(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Unable to change password')
    }
    setChanging(false)
  }

  const roleColors = {
    admin: 'bg-red-500/20 text-red-400',
    doctor: 'bg-blue-500/20 text-blue-400',
    patient: 'bg-green-500/20 text-green-400',
    staff: 'bg-purple-500/20 text-purple-400',
  }

  return (
    <div className="max-w-2xl space-y-6 fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your account settings and password</p>
      </div>

      {loading ? (
        <div className="card p-6">
          <div className="h-5 w-32 animate-pulse rounded" style={{ background: 'var(--border)' }} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i}><div className="h-3 w-20 animate-pulse rounded mb-2" style={{ background: 'var(--border)' }} /><div className="h-5 w-40 animate-pulse rounded" style={{ background: 'var(--border)' }} /></div>
            ))}
          </div>
        </div>
      ) : (
        <section className="card p-6">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <User size={20} className="text-emerald-400" /> Profile
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</p>
              <p className="mt-1 font-medium">{profile?.name || user?.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</p>
              <p className="mt-1 font-medium">{profile?.email || user?.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role</p>
              <p className="mt-1">
                <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${roleColors[profile?.role || user?.role] || 'bg-slate-500/20 text-slate-400'}`}>
                  <Shield size={14} className="inline mr-1" />
                  {profile?.role || user?.role}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Member Since</p>
              <p className="mt-1 font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                }) : '-'}
              </p>
            </div>
            {profile?.last_password_change && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Last Password Change</p>
                <p className="mt-1 font-medium">
                  {new Date(profile.last_password_change).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Shield size={20} className="text-emerald-400" /> Change Password
        </h2>
        <form className="mt-4 space-y-4" onSubmit={changePassword}>
          <label className="block text-sm">
            Current Password
            <div className="relative mt-2">
              <input className="input w-full pr-12" type={showCurrent ? 'text' : 'password'} required
                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <button type="button" aria-label={showCurrent ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                onClick={() => setShowCurrent(v => !v)}>
                {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <label className="block text-sm">
            New Password
            <div className="relative mt-2">
              <input className="input w-full pr-12" type={showNew ? 'text' : 'password'} required
                value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
              <button type="button" aria-label={showNew ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                onClick={() => setShowNew(v => !v)}>
                {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <label className="block text-sm">
            Confirm New Password
            <div className="relative mt-2">
              <input className="input w-full pr-12" type={showConfirm ? 'text' : 'password'} required
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} />
              <button type="button" aria-label={showConfirm ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <button className="btn-primary flex items-center gap-2" disabled={changing}>
            {changing && <Loader2 className="animate-spin" size={18} />}
            Update Password
          </button>
        </form>
      </section>
    </div>
  )
}
