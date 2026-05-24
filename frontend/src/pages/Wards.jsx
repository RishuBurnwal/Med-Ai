import { Bed, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import EmptyState from '../components/EmptyState'
import LoadingSkeleton from '../components/LoadingSkeleton'

const statusColors = {
    available: 'bg-green-500/20 text-green-400',
    occupied: 'bg-red-500/20 text-red-400',
    maintenance: 'bg-yellow-500/20 text-yellow-400',
    reserved: 'bg-blue-500/20 text-blue-400',
  }
  const statColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
  }

export default function Wards() {
  const [wards, setWards] = useState([])
  const [beds, setBeds] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedWard, setSelectedWard] = useState(null)
  const [bedModal, setBedModal] = useState(false)

  async function load() {
    setLoading(true)
    const [w, b, s] = await Promise.allSettled([
      api.get('/wards'),
      api.get('/wards/beds'),
      api.get('/wards/stats'),
    ])
    if (w.status === 'fulfilled') setWards(w.value.data || [])
    if (b.status === 'fulfilled') setBeds(b.value.data || [])
    if (s.status === 'fulfilled') setStats(s.value.data || {})
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filteredBeds = selectedWard ? beds.filter(b => b.ward_id === selectedWard) : beds

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Wards & Beds</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setBedModal(true)}>
          <Plus size={17} /> Add Bed
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Wards', stats.total_wards || 0, 'blue'],
          ['Total Beds', stats.total_beds || 0, 'purple'],
          ['Available', stats.available_beds || 0, 'green'],
          ['Occupancy', `${stats.occupancy_rate || 0}%`, 'orange'],
        ].map(([title, value, color]) => (
          <div key={title} className="card p-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{title}</p>
            <p className={`font-heading text-2xl font-bold ${statColors[color] || 'text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? <LoadingSkeleton type="card" /> : (
        <>
          {/* Wards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {wards.map((w) => (
              <div
                key={w.id}
                className={`card cursor-pointer p-4 transition ${selectedWard === w.id ? 'border-blue-500' : ''}`}
                onClick={() => setSelectedWard(selectedWard === w.id ? null : w.id)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold">{w.name}</h3>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{w.ward_number}</span>
                </div>
                <div className="mt-2 flex gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Floor {w.floor}</span>
                  <span>{w.department_name && `· ${w.department_name}`}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="text-green-400">{w.available_beds} available</span>
                  <span className="text-red-400">{w.total_beds - w.available_beds} occupied</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {w.total_beds} total</span>
                </div>
              </div>
            ))}
          </div>

          {/* Beds */}
          {filteredBeds.length > 0 && (
            <div className="card overflow-x-auto">
              <div className="flex items-center justify-between p-4">
                <h2 className="font-heading font-semibold">
                  {selectedWard ? wards.find(w => w.id === selectedWard)?.name || 'Beds' : 'All Beds'}
                </h2>
                {selectedWard && (
                  <button className="text-xs text-blue-400" onClick={() => setSelectedWard(null)}>Show All</button>
                )}
              </div>
              <table className="w-full text-left text-sm">
                <thead style={{ color: 'var(--text-muted)' }}>
                  <tr><th className="p-4">Bed #</th><th>Ward</th><th>Room</th><th>Type</th><th>Status</th><th>Patient</th></tr>
                </thead>
                <tbody>
                  {filteredBeds.map((b) => (
                    <tr key={b.id} className="border-t hover:bg-[var(--bg-card-hover)]" style={{ borderColor: 'var(--border)' }}>
                      <td className="p-4 font-mono text-xs">{b.bed_number}</td>
                      <td>{b.ward_name || '-'}</td>
                      <td>{b.room_number}</td>
                      <td className="capitalize">{b.bed_type.replace('_', ' ')}</td>
                      <td>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusColors[b.status]}`}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{b.current_patient_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {bedModal && <BedForm onClose={() => setBedModal(false)} onSaved={() => { setBedModal(false); load() }} wards={wards} />}
    </div>
  )
}

function BedForm({ onClose, onSaved, wards }) {
  const [form, setForm] = useState({ bed_number: '', ward_id: '', room_number: '', bed_type: 'general', status: 'available' })

  async function submit(e) {
    e.preventDefault()
    try {
      await api.post('/wards/beds', { ...form, ward_id: Number(form.ward_id) })
      toast.success('Bed added')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add bed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form className="card w-full max-w-lg p-6" onSubmit={submit}>
        <h2 className="mb-5 font-heading text-xl font-semibold">Add Bed</h2>
        <div className="space-y-4">
          <label className="text-sm">Bed Number *<input className="input mt-1 w-full" required value={form.bed_number} onChange={e => setForm({...form, bed_number: e.target.value})} /></label>
          <label className="text-sm">Ward *<select className="input mt-1 w-full" required value={form.ward_id} onChange={e => setForm({...form, ward_id: e.target.value})}>
            <option value="">Select ward</option>
            {wards.map(w => <option key={w.id} value={w.id}>{w.name} ({w.ward_number})</option>)}
          </select></label>
          <label className="text-sm">Room Number *<input className="input mt-1 w-full" required value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} /></label>
          <label className="text-sm">Bed Type<select className="input mt-1 w-full" value={form.bed_type} onChange={e => setForm({...form, bed_type: e.target.value})}>
            {['general','semi_private','private','icu','nicu','emergency'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select></label>
          <label className="text-sm">Status<select className="input mt-1 w-full" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {['available','occupied','maintenance','reserved'].map(s => <option key={s} value={s}>{s}</option>)}
          </select></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Add Bed</button>
        </div>
      </form>
    </div>
  )
}
