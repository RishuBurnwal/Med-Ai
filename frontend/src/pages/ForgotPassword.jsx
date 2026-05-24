import { ArrowLeft, CheckCircle2, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setSent(true)
      if (res.data.token) {
        setToken(res.data.token)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to process request')
    }
    setLoading(false)
  }

  return (
    <div className="grid min-h-screen place-items-center p-6 fade-in" style={{ background: 'var(--bg-secondary)' }}>
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl" style={{ background: 'var(--accent-blue)' }}>
            <Plus className="text-white" size={32} strokeWidth={3} />
          </div>
          <h1 className="mt-6 font-heading text-2xl font-bold text-center">Reset Password</h1>
          <p className="mt-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Enter your email to receive a reset link</p>

          {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 className="mx-auto text-emerald-400" size={32} />
                <p className="mt-2 text-sm text-emerald-300">Reset link sent!</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Check your email for the reset link.</p>
              </div>
              {token && (
                <div className="rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Development Token:</p>
                  <code className="break-all text-emerald-400">{token}</code>
                  <button
                    className="mt-2 text-blue-400 hover:underline block"
                    onClick={() => navigate(`/reset-password?token=${token}`)}
                  >
                    Click to reset now →
                  </button>
                </div>
              )}

              <button className="btn-primary w-full mt-4" onClick={() => navigate('/login')}>
                Back to Login
              </button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm">
                Email Address
                <input className="input mt-2 w-full" type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="admin@hospital.com" />
              </label>
              <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading && <Loader2 className="animate-spin" size={18} />}
                Send Reset Link
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
