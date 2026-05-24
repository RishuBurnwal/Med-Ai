import { CheckCircle2, Eye, EyeOff, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenParam = searchParams.get('token') || ''
  const [token, setToken] = useState(tokenParam)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to reset password')
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
          <h1 className="mt-6 font-heading text-2xl font-bold text-center">Set New Password</h1>
          <p className="mt-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Enter your new password below</p>

          {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 className="mx-auto text-emerald-400" size={32} />
                <p className="mt-2 text-sm text-emerald-300">Password reset successful!</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>You can now sign in with your new password.</p>
              </div>
              <button className="btn-primary w-full" onClick={() => navigate('/login')}>
                Sign In Now
              </button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm">
                Reset Token
                <input className="input mt-2 w-full" required value={token}
                  onChange={e => setToken(e.target.value)} placeholder="Paste your reset token" />
              </label>
              <label className="block text-sm">
                New Password
                <div className="relative mt-2">
                  <input className="input w-full pr-12" type={showPassword ? 'text' : 'password'} required
                    value={password} onChange={e => setPassword(e.target.value)} minLength={6} />
                  <button type="button" aria-label={showPassword ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                    onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              <label className="block text-sm">
                Confirm New Password
                <input className="input mt-2 w-full" type="password" required
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} />
              </label>
              <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading && <Loader2 className="animate-spin" size={18} />}
                Reset Password
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
