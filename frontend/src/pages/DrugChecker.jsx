import { AlertTriangle, ArrowLeftRight, Plus, Shield, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ModelSelector from '../components/ModelSelector'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

export default function DrugChecker() {
  const [provider, setProvider] = useState('groq')
  const [drug, setDrug] = useState('')
  const [drugs, setDrugs] = useState([])
  const [age, setAge] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [infoName, setInfoName] = useState('')
  const [info, setInfo] = useState(null)

  function add() {
    if (drug.trim() && !drugs.includes(drug.trim())) {
      setDrugs([...drugs, drug.trim()])
      setDrug('')
    }
  }

  async function check() {
    setLoading(true)
    try {
      const res = await api.post('/ai/drug-interaction', { drugs, patient_age: Number(age) || null, provider })
      setResults(res.data)
    } catch {
      toast.error('Unable to check interactions')
    } finally {
      setLoading(false)
    }
  }

  async function getInfo() {
    try {
      const res = await api.post('/ai/drug-info', { drug_name: infoName, provider })
      setInfo(res.data)
    } catch {
      toast.error('Unable to get drug information')
    }
  }

  const level = results?.high_risk_alert ? 'high' : results?.interactions?.some((i) => i.severity === 'moderate') ? 'caution' : 'safe'

  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <section className="card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="flex items-center gap-2 font-heading text-xl font-bold"><Shield /> Drug Interaction Checker</h1>
          <ModelSelector value={provider} onChange={setProvider} />
        </div>
        <label className="text-sm">
          Add Medications
          <div className="mt-2 flex gap-2">
            <input className="input flex-1" placeholder="Type medication name..." value={drug} onChange={(e) => setDrug(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
            <button aria-label="Add medication" className="btn-primary" onClick={add}><Plus size={17} /></button>
          </div>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">{drugs.map((d) => <span className="chip" key={d}>{d}<button aria-label={`Remove ${d}`} onClick={() => setDrugs(drugs.filter((item) => item !== d))}><X size={13} /></button></span>)}</div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{drugs.length} medication(s) added</p>
        {drugs.length === 1 && <div className="mt-3 rounded-lg border border-orange-400/30 bg-orange-400/10 p-3 text-sm text-orange-300">Add at least 2 medications to check interactions</div>}
        <label className="mt-4 block text-sm">Patient Age (optional)<input className="input mt-1 w-full" type="number" value={age} onChange={(e) => setAge(e.target.value)} /></label>
        <button className="btn-primary mt-4 flex w-full items-center justify-center gap-2" disabled={drugs.length < 2 || loading} onClick={check}><Shield size={17} /> {loading ? 'Checking interactions...' : 'Check Interactions'}</button>
        <div className="my-5 h-px" style={{ background: 'var(--border)' }} />
        <label className="text-sm">Search Drug Information<div className="mt-2 flex gap-2"><input className="input flex-1" value={infoName} onChange={(e) => setInfoName(e.target.value)} placeholder="Metformin" /><button className="input px-4" onClick={getInfo}>Get Info</button></div></label>
        {info && <div className="mt-4 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}><h3 className="font-heading text-lg font-semibold">{info.name || infoName}</h3>{['uses', 'dosage_forms', 'common_side_effects', 'contraindications', 'storage'].map((key) => <p key={key} className="mt-2"><span style={{ color: 'var(--text-muted)' }}>{key.replaceAll('_', ' ')}: </span>{Array.isArray(info[key]) ? info[key].join(', ') : info[key]}</p>)}</div>}
      </section>
      <section>{!results ? <EmptyState icon={<ShieldCheck size={42} />} title="Add medications and check for interactions" message="The clinical pharmacist AI will flag major, moderate, and minor interaction risks." /> : <div className="space-y-4"><div className={`rounded-xl border p-4 ${level === 'high' ? 'border-red-400/40 bg-red-400/10 text-red-300' : level === 'caution' ? 'border-orange-400/40 bg-orange-400/10 text-orange-300' : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'}`}><div className="flex items-center gap-2 font-semibold">{level === 'safe' ? <ShieldCheck /> : <AlertTriangle />} {level === 'high' ? 'High Risk — Major interactions detected' : level === 'caution' ? 'Caution — Moderate interactions found' : 'No significant interactions detected'}</div></div>{(results.interactions || []).map((i, index) => <details key={index} className="card p-4" open><summary className="flex cursor-pointer items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold">{i.drug1} <ArrowLeftRight size={16} /> {i.drug2}</span><StatusBadge status={i.severity} /></summary><p className="mt-3 text-sm">{i.description}</p><div className="mt-3 border-l-4 border-blue-400 bg-blue-400/10 p-3 text-sm">{i.recommendation}</div></details>)}{Boolean(results.safe_combinations?.length) && <div className="card p-4"><h3 className="font-semibold text-emerald-300">Safe Combinations</h3>{results.safe_combinations.map((s) => <p key={s} className="mt-2 text-sm">✓ {s}</p>)}</div>}<div className="card p-4"><p>{results.overall_summary}</p><p className="mt-3 text-sm italic" style={{ color: 'var(--text-muted)' }}>{results.disclaimer}</p></div></div>}</section>
    </div>
  )
}