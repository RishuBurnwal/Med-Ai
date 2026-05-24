import { DollarSign, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../lib/utils'

export default function Billing() {
  const [bills, setBills] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [page, setPage] = useState(1)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (statusFilter) params.set('payment_status', statusFilter)
    const [b, s] = await Promise.allSettled([
      api.get(`/billing?${params}`),
      api.get('/billing/stats'),
    ])
    if (b.status === 'fulfilled') setBills(b.value.data.bills || [])
    if (s.status === 'fulfilled') setStats(s.value.data || {})
    setLoading(false)
  }
  useEffect(() => { load() }, [page, statusFilter])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Billing</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}>
          <Plus size={17} /> New Bill
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
          <p className="font-heading text-2xl font-bold text-green-400">₹{Number(stats.total_revenue || 0).toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending</p>
          <p className="font-heading text-2xl font-bold text-red-400">₹{Number(stats.total_pending || 0).toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Bills</p>
          <p className="font-heading text-2xl font-bold">{stats.total_bills || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Paid</p>
          <p className="font-heading text-2xl font-bold text-blue-400">{stats.paid_count || 0}</p>
        </div>
      </div>

      <div className="card flex gap-3 p-4">
        <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {['pending','paid','partial','cancelled','refunded'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <LoadingSkeleton type="table" /> : !bills.length ? (
        <EmptyState icon={<DollarSign size={34} />} title="No bills found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-muted)' }}>
              <tr><th className="p-4">Invoice</th><th>Patient</th><th>Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {bills.map((b) => {
                const balance = Number(b.total_amount) - Number(b.paid_amount)
                return (
                  <tr key={b.id} className="border-t hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}>
                    <td className="p-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{b.invoice_number}</td>
                    <td className="font-medium">{b.patient_name || b.patient_id}</td>
                    <td className="capitalize">{b.bill_type.replace('_', ' ')}</td>
                    <td>₹{Number(b.total_amount).toLocaleString()}</td>
                    <td className="text-green-400">₹{Number(b.paid_amount).toLocaleString()}</td>
                    <td className={balance > 0 ? 'text-red-400' : ''}>₹{balance.toLocaleString()}</td>
                    <td><StatusBadge status={b.payment_status}>{b.payment_status}</StatusBadge></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(b.billing_date)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && <BillForm onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />}
    </div>
  )
}

function BillForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    patient_id: '', bill_type: 'consultation', description: '', amount: 0, discount: 0, tax: 0, payment_method: '', due_date: '', notes: '',
  })
  const [patients, setPatients] = useState([])

  useEffect(() => {
    api.get('/patients?limit=200').then(r => setPatients(r.data.items || r.data || [])).catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    try {
      await api.post('/billing', { ...form, payment_method: form.payment_method || null, due_date: form.due_date || null })
      toast.success('Bill created')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-lg p-6" onSubmit={submit}>
        <h2 className="mb-5 font-heading text-xl font-semibold">Create Bill</h2>
        <div className="space-y-4">
          <label className="text-sm">Patient *<select className="input mt-1 w-full" required value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})}>
            <option value="">Select patient</option>
            {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</option>)}
          </select></label>
          <label className="text-sm">Bill Type<select className="input mt-1 w-full" value={form.bill_type} onChange={e => setForm({...form, bill_type: e.target.value})}>
            {['consultation','admission','lab_test','procedure','pharmacy','emergency','other'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select></label>
          <label className="text-sm">Amount (₹)<input className="input mt-1 w-full" type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} /></label>
          <label className="text-sm">Discount<input className="input mt-1 w-full" type="number" step="0.01" value={form.discount} onChange={e => setForm({...form, discount: Number(e.target.value)})} /></label>
          <label className="text-sm">Tax<input className="input mt-1 w-full" type="number" step="0.01" value={form.tax} onChange={e => setForm({...form, tax: Number(e.target.value)})} /></label>
          <label className="text-sm">Description<textarea className="input mt-1 min-h-16 w-full py-3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Create Bill</button>
        </div>
      </form>
    </div>
  )
}
