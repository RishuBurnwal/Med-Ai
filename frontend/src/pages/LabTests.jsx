import { FlaskConical, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../lib/utils'

export default function LabTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/lab-tests?${params}`)
      setTests(res.data.lab_tests || [])
    } catch { setTests([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [statusFilter])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Lab Tests</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}>
          <Plus size={17} /> Order Test
        </button>
      </div>

      <div className="card flex gap-3 p-4">
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['ordered','collected','processing','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <LoadingSkeleton type="table" /> : !tests.length ? (
        <EmptyState icon={<FlaskConical size={34} />} title="No lab tests" message="Order lab tests for patients." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-muted)' }}>
              <tr><th className="p-4">Test ID</th><th>Patient</th><th>Test Name</th><th>Category</th><th>Sample</th><th>Status</th><th>Doctor</th><th>Date</th></tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-t hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{t.test_id}</td>
                  <td className="font-medium">{t.patient_name || t.patient_id}</td>
                  <td>{t.test_name}</td>
                  <td className="capitalize">{t.category}</td>
                  <td className="capitalize">{t.sample_type}</td>
                  <td><StatusBadge status={t.status}>{t.status}</StatusBadge></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.doctor_name || t.ordered_by}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <LabTestForm onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />}
    </div>
  )
}

function LabTestForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ patient_id: '', test_name: '', category: 'pathology', sample_type: 'blood', notes: '' })
  const [patients, setPatients] = useState([])

  useEffect(() => {
    api.get('/patients?limit=200').then(r => setPatients(r.data.items || r.data || [])).catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    try {
      await api.post('/lab-tests', form)
      toast.success('Lab test ordered')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-lg p-6" onSubmit={submit}>
        <h2 className="mb-5 font-heading text-xl font-semibold">Order Lab Test</h2>
        <div className="space-y-4">
          <label className="text-sm">Patient *<select className="input mt-1 w-full" required value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})}>
            <option value="">Select patient</option>
            {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</option>)}
          </select></label>
          <label className="text-sm">Test Name *<input className="input mt-1 w-full" required value={form.test_name} onChange={e => setForm({...form, test_name: e.target.value})} /></label>
          <label className="text-sm">Category<select className="input mt-1 w-full" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
            {['pathology','radiology','cardiology','microbiology','other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select></label>
          <label className="text-sm">Sample Type<select className="input mt-1 w-full" value={form.sample_type} onChange={e => setForm({...form, sample_type: e.target.value})}>
            {['blood','urine','stool','imaging','swab','tissue','other'].map(s => <option key={s} value={s}>{s}</option>)}
          </select></label>
          <label className="text-sm">Notes<textarea className="input mt-1 min-h-16 w-full py-3" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Order Test</button>
        </div>
      </form>
    </div>
  )
}
