import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import api from './services/api'
import ForgotPasswordPage from './ForgotPassword'
import ResetPasswordPage from './ResetPassword'
import PatientSettings from './Settings'

// ── Auth Context ──
const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadPatientProfile() {
    try {
      const res = await api.get('/patients/me/profile')
      localStorage.setItem('patient_profile', JSON.stringify(res.data))
      setPatient(res.data)
      return res.data
    } catch {
      return null
    }
  }

  useEffect(() => {
    const t = localStorage.getItem('patient_token')
    const u = localStorage.getItem('patient_user')
    const p = localStorage.getItem('patient_profile')
    if (t && u) {
      try { setUser(JSON.parse(u)) } catch { localStorage.clear() }
      if (p) {
        try { setPatient(JSON.parse(p)) } catch {}
      }
      // Auto-refresh patient profile from server if missing
      if (!p) {
        loadPatientProfile().finally(() => setLoading(false))
        return
      }
    }
    setLoading(false)
  }, [])

  async function login(email, password) {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const res = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('patient_token', res.data.access_token)
    const me = await api.get('/auth/me')
    localStorage.setItem('patient_user', JSON.stringify(me.data))
    setUser(me.data)
    await loadPatientProfile()
    return me.data
  }

  async function register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password })
    return res.data
  }

  function logout() {
    localStorage.removeItem('patient_token')
    localStorage.removeItem('patient_user')
    localStorage.removeItem('patient_profile')
    setUser(null)
    setPatient(null)
    navigate('/login')
  }

  const value = useMemo(() => ({
    user, patient, loading, login, register, logout, loadPatientProfile,
    changePassword: async (currentPassword, newPassword) => {
      const res = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      return res.data
    },
    isAuthenticated: Boolean(localStorage.getItem('patient_token')),
  }), [user, patient, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

// ── Components ──
function Navbar() {
  const { user, logout } = useAuth()
  return (
    <header className="fixed top-0 right-0 left-0 z-30 flex h-14 items-center justify-between border-b px-4" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'var(--accent)' }}>
          <span className="text-sm font-bold text-white">P+</span>
        </div>
        <span className="font-heading font-bold">Patient Portal</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm sm:block" style={{ color: 'var(--text-secondary)' }}>{user?.name}</span>
        <button className="icon-btn" onClick={logout} title="Sign out">✕</button>
      </div>
    </header>
  )
}

function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 pt-20 pb-8 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid min-h-[300px] place-items-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  )
}

function Protect({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSkeleton />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

// ── Pages ──
function LoginPage() {
  const { login, register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [regName, setRegName] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Sign in failed')
    }
    setLoading(false)
  }

  async function register(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerUser(regName, email, password)
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="grid min-h-screen place-items-center p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="card w-full max-w-md p-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white" style={{ background: 'var(--accent)' }}>
          <span className="text-3xl font-bold">+</span>
        </div>
        <h1 className="mt-6 font-heading text-2xl font-bold text-center">Welcome to MedAI</h1>
        <p className="mt-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Patient Portal — Access your health records</p>

        {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {!showRegister ? (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm">Email<input className="input mt-1 w-full" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@example.com" /></label>
            <label className="block text-sm">Password<input className="input mt-1 w-full" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" /></label>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
            <div className="flex justify-between items-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                New here? <button type="button" className="text-emerald-400 underline" onClick={() => setShowRegister(true)}>Create account</button>
              </p>
              <Link to="/forgot-password" className="text-xs text-emerald-400 hover:underline">Forgot password?</Link>
            </div>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={register}>
            <label className="block text-sm">Full Name<input className="input mt-1 w-full" required value={regName} onChange={e => setRegName(e.target.value)} placeholder="John Doe" /></label>
            <label className="block text-sm">Email<input className="input mt-1 w-full" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@example.com" /></label>
            <label className="block text-sm">Password<input className="input mt-1 w-full" type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} /></label>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Already have an account? <button type="button" className="text-emerald-400 underline" onClick={() => setShowRegister(false)}>Sign in</button>
            </p>
          </form>
        )}

        <div className="mt-4 rounded-lg border p-3 text-xs text-center" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
          Demo: admin@hospital.com / Admin@123
        </div>
      </div>
    </div>
  )
}

function PatientDashboard() {
  const { user, patient } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const pid = patient?.patient_id
      const apptParams = pid ? `?patient_id=${pid}&limit=5` : '?limit=5'
      const billParams = pid ? `?patient_id=${pid}&limit=5` : '?limit=5'
      const [ap, bl] = await Promise.allSettled([
        api.get(`/appointments${apptParams}`),
        api.get(`/billing${billParams}`),
      ])
      if (ap.status === 'fulfilled') setAppointments(ap.value.data.items || [])
      if (bl.status === 'fulfilled') setBills(bl.value.data.bills || [])
      setLoading(false)
    }
    load()
  }, [patient?.patient_id])

  const scheduled = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length
  const completed = appointments.filter(a => a.status === 'completed').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Your health dashboard at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Appointments', appointments.length, '📅'],
          ['Upcoming', scheduled, '🕐'],
          ['Completed', completed, '✅'],
          ['Total Bills', bills.length, '💰'],
        ].map(([title, value, icon]) => (
          <div key={title} className="card p-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{icon} {title}</p>
            <p className="font-heading text-2xl font-bold text-emerald-400">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Recent Appointments</h2>
            <button className="btn-primary text-xs px-3 py-1.5" onClick={() => navigate('/appointments')}>Book</button>
          </div>
          {appointments.length === 0 ? (
            <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No appointments yet. Book your first appointment today!</p>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.doctor_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.department} · {new Date(a.appointment_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    a.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    a.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
          {appointments.length > 0 && (
            <button className="mt-3 text-sm text-emerald-400" onClick={() => navigate('/appointments')}>View all →</button>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Recent Bills</h2>
          </div>
          {bills.length === 0 ? (
            <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No bills found.</p>
          ) : (
            <div className="space-y-3">
              {bills.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{b.invoice_number}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.bill_type.replace('_', ' ')} · ₹{Number(b.total_amount).toLocaleString()}</p>
                  </div>
                  <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    b.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                    b.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{b.payment_status}</span>
                </div>
              ))}
            </div>
          )}
          {bills.length > 0 && (
            <button className="mt-3 text-sm text-emerald-400" onClick={() => navigate('/bills')}>View all →</button>
          )}
        </section>
      </div>
    </div>
  )
}

function BookingModal({ departments, onClose, onSaved }) {
  const { patient } = useAuth()
  const [form, setForm] = useState({ doctor_name: '', department: 'General Medicine', appointment_date: '', appointment_type: 'in-person', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!patient?.patient_id) {
      setError('Patient profile not loaded. Please try again.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post('/appointments', {
        patient_id: patient.patient_id,
        doctor_name: form.doctor_name,
        department: form.department,
        appointment_date: form.appointment_date,
        appointment_type: form.appointment_type,
        reason: form.reason,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to book appointment')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-lg p-6" onSubmit={submit}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold">📅 Book Appointment</h2>
          <button type="button" className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Department
            <select className="input mt-1 w-full" required value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Doctor Name
            <input className="input mt-1 w-full" required value={form.doctor_name}
              onChange={e => setForm({ ...form, doctor_name: e.target.value })}
              placeholder="e.g., Dr. Sharma" />
          </label>
          <label className="text-sm sm:col-span-2">
            Date & Time
            <input className="input mt-1 w-full" required type="datetime-local" value={form.appointment_date}
              onChange={e => setForm({ ...form, appointment_date: e.target.value })}
              min={new Date().toISOString().slice(0, 16)} />
          </label>
        </div>

        <div className="mt-4 flex gap-4">
          {['in-person', 'teleconsult'].map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors" style={{
              borderColor: form.appointment_type === type ? 'var(--accent)' : 'var(--border)',
              background: form.appointment_type === type ? 'var(--accent-alpha)' : 'transparent',
            }}>
              <input type="radio" className="sr-only" checked={form.appointment_type === type}
                onChange={() => setForm({ ...form, appointment_type: type })} />
              <span className={`capitalize ${form.appointment_type === type ? 'text-emerald-400' : ''}`}>{type.replace('-', ' ')}</span>
            </label>
          ))}
        </div>

        <label className="mt-4 block text-sm">
          Reason for Visit
          <textarea className="input mt-1 min-h-20 w-full py-2" required value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })}
            placeholder="Describe your symptoms or reason for visit..." />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex items-center gap-2" disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Cancel Confirmation Dialog ──
function CancelConfirmDialog({ appointment, onClose, onCancelled }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setSubmitting(true)
    setError('')
    try {
      await api.put(`/appointments/${appointment.id}/cancel`, { reason })
      onCancelled()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to cancel appointment')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-red-400">⚠️ Cancel Appointment</h2>
          <button type="button" className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4 rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <p className="font-medium text-sm">{appointment.doctor_name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{appointment.department}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <label className="block text-sm">
          Reason for cancellation (optional)
          <textarea
            className="input mt-1 w-full min-h-20 py-2"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tell us why you're cancelling..."
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4 py-2 text-sm" onClick={onClose}>Keep Appointment</button>
          <button
            className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
            disabled={submitting}
            onClick={confirm}
          >
            {submitting ? 'Cancelling...' : 'Yes, Cancel Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status Timeline ──
function AppointmentTimeline({ appointment }) {
  const steps = [
    { label: 'Booked', date: appointment.created_at, icon: '📅', done: true },
    {
      label: 'Scheduled',
      date: appointment.appointment_date,
      icon: '🕐',
      done: appointment.status !== 'cancelled' || appointment.status === 'scheduled',
    },
    {
      label: appointment.status === 'cancelled' ? 'Cancelled' : 'Completed',
      date: appointment.cancelled_at || appointment.appointment_date,
      icon: appointment.status === 'cancelled' ? '❌' : '✅',
      done: appointment.status === 'completed' || appointment.status === 'cancelled',
      isCancelled: appointment.status === 'cancelled',
    },
  ]

  return (
    <div className="flex items-start gap-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs ${
              step.isCancelled ? 'bg-red-500/20 text-red-400' :
              step.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-500'
            }`}>
              {step.icon}
            </div>
            <p className={`mt-1 text-[10px] leading-tight text-center ${
              step.isCancelled ? 'text-red-400' :
              step.done ? 'text-emerald-400' : 'text-slate-500'
            }`}>{step.label}</p>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mt-[-16px] mx-1 ${
              step.done && !step.isCancelled ? 'bg-emerald-500/30' : 'bg-slate-600/30'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

function PatientAppointments() {
  const { patient } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [cancelTarget, setCancelTarget] = useState(null)

  async function load() {
    try {
      const pid = patient?.patient_id
      const params = pid ? `?patient_id=${pid}&limit=50` : '?limit=50'
      const [apptRes, deptRes] = await Promise.allSettled([
        api.get(`/appointments${params}`),
        api.get('/departments'),
      ])
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data.items || [])
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [patient?.patient_id])

  const filtered = filterStatus === 'All'
    ? appointments
    : appointments.filter(a => a.status === filterStatus.toLowerCase())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">My Appointments</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{appointments.length} total</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowBooking(true)}>
          <span>+</span> Book Appointment
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Scheduled', 'Completed', 'Cancelled'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'border text-slate-400 hover:bg-[var(--bg-card-hover)]'
            }`} style={filterStatus !== s ? { borderColor: 'var(--border)' } : {}}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton /> : !filtered.length ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">📅</p>
          <p className="font-medium">{filterStatus === 'All' ? 'No appointments yet' : `No ${filterStatus.toLowerCase()} appointments`}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Book your first appointment to get started.</p>
          {filterStatus === 'All' && (
            <button className="btn-primary mt-4" onClick={() => setShowBooking(true)}>Book Now</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-400 text-lg">
                    {a.appointment_type === 'teleconsult' ? '📹' : '🏥'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.doctor_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.department}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(a.appointment_date).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        a.appointment_type === 'teleconsult' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'
                      }`}>{a.appointment_type}</span>
                    </div>
                    {a.reason && <p className="mt-1 text-xs truncate" style={{ color: 'var(--text-muted)' }}>"{a.reason}"</p>}
                    {a.cancellation_reason && a.status === 'cancelled' && (
                      <p className="mt-1 text-xs text-red-400/70 italic">Cancellation reason: {a.cancellation_reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium capitalize ${
                    a.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    a.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    a.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{a.status}</span>
                  {(a.status !== 'completed' && a.status !== 'cancelled') && (
                    <button
                      onClick={() => setCancelTarget(a)}
                      className="text-xs px-2.5 py-1 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {/* Status Timeline */}
              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <AppointmentTimeline appointment={a} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showBooking && (
        <BookingModal
          departments={departments}
          onClose={() => setShowBooking(false)}
          onSaved={load}
        />
      )}

      {cancelTarget && (
        <CancelConfirmDialog
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={load}
        />
      )}
    </div>
  )
}

function PatientBills() {
  const { patient } = useAuth()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pid = patient?.patient_id
    const params = pid ? `?patient_id=${pid}&limit=50` : '?limit=50'
    api.get(`/billing${params}`)
      .then(r => setBills(r.data.bills || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [patient?.patient_id])

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">My Bills</h1>
      {loading ? <LoadingSkeleton /> : !bills.length ? (
        <div className="card p-8 text-center">
          <p className="text-lg">💰 No bills found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((b) => (
            <div key={b.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{b.invoice_number}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{b.bill_type.replace('_', ' ')} · {new Date(b.billing_date).toLocaleDateString()}</p>
                {b.description && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{b.description}</p>}
              </div>
              <div className="text-right">
                <p className="font-heading font-bold text-lg">₹{Number(b.total_amount).toLocaleString()}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  b.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                  b.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{b.payment_status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PatientChatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am MedAssist AI. How can I help you with your health today?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await api.post('/ai/chat', {
        message: userMsg,
        conversation_history: messages.slice(-10),
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Service unavailable. Please try again later.' }])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">💬 MedAssist Chatbot</h1>
      <div className="card flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'border' 
              }`} style={m.role === 'assistant' ? { borderColor: 'var(--border)', background: 'var(--bg-secondary)' } : {}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-4 flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <input className="input flex-1" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about your symptoms..." />
          <button className="btn-primary" onClick={send} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  )
}

function PatientLabs() {
  const { patient } = useAuth()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pid = patient?.patient_id
    const params = pid ? `?patient_id=${pid}&limit=50` : '?limit=50'
    api.get(`/lab-tests${params}`)
      .then(r => setTests(r.data.lab_tests || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [patient?.patient_id])

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">🔬 Lab Reports</h1>
      {loading ? <LoadingSkeleton /> : !tests.length ? (
        <div className="card p-8 text-center">
          <p className="text-lg">No lab tests found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-muted)' }}>
              <tr><th className="p-4">Test</th><th>Category</th><th>Status</th><th>Result</th><th>Date</th></tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-4 font-medium">{t.test_name}</td>
                  <td className="capitalize">{t.category}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      t.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      t.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{t.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }} className="max-w-xs truncate">{t.result_text || '-'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PatientDrugChecker() {
  const [drugs, setDrugs] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function check() {
    if (!drugs.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/ai/drug-interaction', {
        drugs: drugs.split(',').map(d => d.trim()),
      })
      setResult(res.data)
    } catch { setResult({ overall_summary: 'Service unavailable' }) }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">💊 Drug Interaction Checker</h1>
      <div className="card p-5">
        <label className="text-sm block">Enter medications (comma separated)</label>
        <div className="mt-2 flex gap-3">
          <input className="input flex-1" value={drugs} onChange={e => setDrugs(e.target.value)}
            placeholder="e.g., Metformin, Aspirin, Atorvastatin" />
          <button className="btn-primary" onClick={check} disabled={loading}>Check</button>
        </div>
      </div>

      {result && (
        <div className="card p-5 space-y-4">
          {result.high_risk_alert && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="font-bold text-red-400">⚠️ High Risk Alert</p>
            </div>
          )}
          {result.interactions?.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-2">Interactions Found</h3>
              <div className="space-y-3">
                {result.interactions.map((inter, i) => (
                  <div key={i} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    <p className="font-medium">{inter.drug1} + {inter.drug2}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      inter.severity === 'major' ? 'bg-red-500/20 text-red-400' :
                      inter.severity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{inter.severity}</span>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{inter.description}</p>
                    {inter.recommendation && <p className="text-sm mt-1 text-emerald-400">{inter.recommendation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{result.overall_summary}</p>
          {result.disclaimer && <p className="text-xs text-red-400">{result.disclaimer}</p>}
        </div>
      )}
    </div>
  )
}

function PatientPrescriptions() {
  const { patient } = useAuth()
  const [prescriptions, setPrescriptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const pid = patient?.patient_id
      const params = pid ? `?patient_id=${pid}&limit=50` : '?limit=50'
      const res = await api.get(`/prescriptions${params}`)
      setPrescriptions(res.data.prescriptions || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [patient?.patient_id])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">📋 My Prescriptions</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{prescriptions.length} total</p>
        </div>
      </div>

      {loading ? <LoadingSkeleton /> : !prescriptions.length ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-medium">No prescriptions yet</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Your prescriptions will appear here once issued by a doctor.</p>
        </div>
      ) : selected ? (
        <PrescriptionDetail prescription={selected} onBack={() => setSelected(null)} />
      ) : (
        <div className="space-y-3">
          {prescriptions.map((p) => (
            <div key={p.id} className="card cursor-pointer p-4 transition-colors hover:bg-[var(--bg-card-hover)]" onClick={() => setSelected(p)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-purple-500/20 text-purple-400 text-lg">
                    💊
                  </div>
                  <div>
                    <p className="font-medium">Dr. {p.doctor_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {p.prescription_id} · {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {p.diagnosis && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Diagnosis: {p.diagnosis}</p>
                    )}
                    {p.medications?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.medications.slice(0, 3).map((m, i) => (
                          <span key={i} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                            {m.medication_name} {m.dosage}
                          </span>
                        ))}
                        {p.medications.length > 3 && (
                          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-slate-400">
                            +{p.medications.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-slate-500">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrescriptionDetail({ prescription, onBack }) {
  const [dlLoading, setDlLoading] = useState(false)

  async function downloadPdf() {
    setDlLoading(true)
    try {
      const token = localStorage.getItem('patient_token')
      const response = await fetch(
        `http://localhost:8000/api/prescriptions/${prescription.id || prescription.prescription_id}/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prescription_${prescription.prescription_id || 'download'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setDlLoading(false)
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-emerald-400 hover:underline">
        ← Back to Prescriptions
      </button>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold">Prescription</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{prescription.prescription_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadPdf}
              disabled={dlLoading}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {dlLoading ? '⏳' : '📄'} {dlLoading ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>
        <div className="mt-1 text-right text-sm">
          <p className="font-medium">Dr. {prescription.doctor_name}</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {new Date(prescription.created_at).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>

        {prescription.diagnosis && (
          <div className="mt-4 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Diagnosis</p>
            <p className="mt-1 text-sm">{prescription.diagnosis}</p>
          </div>
        )}

        <div className="mt-5">
          <h3 className="font-heading font-semibold mb-3">Medications</h3>
          <div className="space-y-3">
            {prescription.medications?.map((m, i) => (
              <div key={i} className="rounded-lg border p-4 transition-colors hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.medication_name}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{m.dosage}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400 capitalize">
                    {m.route}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Frequency:</span>
                    <p>{m.frequency}</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Duration:</span>
                    <p>{m.duration}</p>
                  </div>
                </div>
                {m.instructions && (
                  <p className="mt-2 text-xs italic" style={{ color: 'var(--text-secondary)' }}>💡 {m.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {prescription.notes && (
          <div className="mt-5 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Notes</p>
            <p className="mt-1 text-sm">{prescription.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Navigation Bar for patient portal ──
function PatientSidebar() {
  const navigate = useNavigate()
  const loc = window.location.pathname
  const links = [
    ['/dashboard', '📊', 'Dashboard'],
    ['/appointments', '📅', 'Appointments'],
    ['/prescriptions', '📋', 'Prescriptions'],
    ['/bills', '💰', 'Bills'],
    ['/labs', '🔬', 'Lab Reports'],
    ['/chatbot', '💬', 'AI Chatbot'],
    ['/drug-checker', '💊', 'Drug Checker'],
    ['/settings', '⚙️', 'Settings'],
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t flex justify-around p-2 sm:static sm:border-t-0 sm:border-r sm:flex-col sm:w-48 sm:h-screen sm:pt-20" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      {links.map(([path, icon, label]) => (
        <button key={path} onClick={() => navigate(path)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            loc === path ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-[var(--bg-card-hover)]'
          }`}>
          <span>{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── App ──
function AppContent() {
  const { isAuthenticated } = useAuth()
  const hideNav = window.location.pathname === '/login'

  return (
    <div className="flex">
      {isAuthenticated && !hideNav && <PatientSidebar />}
      <div className="flex-1">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<Protect><PatientDashboard /></Protect>} />
          <Route path="/appointments" element={<Protect><PatientAppointments /></Protect>} />
          <Route path="/prescriptions" element={<Protect><PatientPrescriptions /></Protect>} />
          <Route path="/bills" element={<Protect><PatientBills /></Protect>} />
          <Route path="/labs" element={<Protect><PatientLabs /></Protect>} />
          <Route path="/chatbot" element={<Protect><PatientChatbot /></Protect>} />
          <Route path="/drug-checker" element={<Protect><PatientDrugChecker /></Protect>} />
          <Route path="/settings" element={<Protect><PatientSettings /></Protect>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
        success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
        error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
      }} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export { useAuth }
