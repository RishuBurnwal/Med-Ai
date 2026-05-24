import { CheckCircle2, Eye, EyeOff, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@hospital.com')
  const [password, setPassword] = useState('Admin@123')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const userData = await login(email, password)
      // Route based on role
      if (userData?.role === 'doctor') {
        navigate('/doctor-dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to sign in with those credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex items-center justify-center p-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-md">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl text-white lg:mx-0" style={{ background: 'var(--accent-blue)' }}><Plus aria-hidden="true" size={52} strokeWidth={3} /></div>
          <h1 className="mt-8 font-heading text-4xl font-bold">MedAI</h1>
          <p className="mt-2 text-lg" style={{ color: 'var(--text-secondary)' }}>Intelligent Hospital Ecosystem</p>
          <div className="mt-10 space-y-4">
            {['AI-Powered Diagnosis Support', 'Multi-Model Medical Analysis', 'Real-time Clinical Decision Making'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm"><CheckCircle2 aria-hidden="true" size={18} className="text-emerald-400" />{item}</div>
            ))}
          </div>
          <p className="mt-12 text-sm" style={{ color: 'var(--text-secondary)' }}>Powered by Gemini · Groq · OpenRouter · NVIDIA NIM</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-8">
        <form className="w-full max-w-md" onSubmit={handleSubmit}>
          <h2 className="font-heading text-3xl font-bold">Welcome back</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in to your account</p>
          {error && <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          <label className="mt-6 block text-sm">Email Address
            <input className="input mt-2 w-full" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="doctor@hospital.com" type="email" required />
          </label>
          <label className="mt-4 block text-sm">Password
            <div className="relative mt-2">
              <input className="input w-full pr-12" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} required />
              <button type="button" aria-label={showPassword ? 'Hide text' : 'Show text'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
          </label>
          <div className="mt-2 flex justify-end">
            <Link to="/forgot-password" className="text-xs text-blue-400 hover:underline">Forgot password?</Link>
          </div>
          <button className="btn-primary mt-4 flex w-full items-center justify-center gap-2" disabled={loading}>{loading && <Loader2 className="animate-spin" size={18} />} Sign In</button>
          <div className="mt-4 rounded-lg border p-3 text-xs" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            Demo: admin@hospital.com / Admin@123
          </div>
        </form>
      </section>
    </div>
  )
}
