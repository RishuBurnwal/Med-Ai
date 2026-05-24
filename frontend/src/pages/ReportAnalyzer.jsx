import { CheckCircle2, Copy, Download, FileSearch, FileText, FileUp, Sparkles, UploadCloud, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ModelSelector from '../components/ModelSelector'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

const types = { blood_test: ['🔬', 'Blood Test', 'CBC, lipids, sugar'], xray: ['📷', 'X-Ray / Scan', 'Radiology image'], prescription: ['💊', 'Prescription', 'Medication reading'], general: ['📄', 'General', 'Clinical document'] }

export default function ReportAnalyzer() {
  const [provider, setProvider] = useState('gemini')
  const [type, setType] = useState('general')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem('medai_recent_reports') || '[]'))

  useEffect(() => {
    if (file?.type?.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview('')
  }, [file])

  async function analyze() {
    if (!file) return
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('analysis_type', type)
    try {
      const res = await api.post('/ai/analyze-report', form, { timeout: 60000 })
      setResult(res.data)
      const next = [{ ...res.data, filename: file.name }, ...recent].slice(0, 5)
      setRecent(next)
      localStorage.setItem('medai_recent_reports', JSON.stringify(next))
    } catch {
      toast.error('Unable to analyze report')
    } finally {
      setLoading(false)
    }
  }

  function download() {
    const blob = new Blob([result.analysis], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'medai-analysis.txt'
    a.click()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 font-heading text-xl font-bold"><FileUp /> Upload Medical Report</h1>
          <ModelSelector value={provider} onChange={setProvider} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(types).map(([id, [emoji, label, desc]]) => (
            <button key={id} className={`rounded-xl border p-4 text-left ${type === id ? 'border-blue-500 bg-blue-500/10' : ''}`} style={{ borderColor: type === id ? 'var(--accent-blue)' : 'var(--border)' }} onClick={() => setType(id)}>
              <div className="text-2xl">{emoji}</div>
              <b>{label}</b>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </button>
          ))}
        </div>
        <label className="mt-5 grid min-h-64 cursor-pointer place-items-center rounded-xl border-2 border-dashed p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          {file ? (
            <div className="relative w-full">
              {preview ? <img className="mx-auto max-h-52 object-contain" src={preview} /> : <><FileText className="mx-auto text-red-400" size={64} /><p>{file.name}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(file.size / 1024)} KB</p></>}
              <button type="button" aria-label="Remove uploaded file" className="icon-btn absolute right-0 top-0" onClick={(e) => { e.preventDefault(); setFile(null) }}><X size={16} /></button>
            </div>
          ) : (
            <div>
              <UploadCloud className="mx-auto mb-3" size={48} style={{ color: 'var(--text-muted)' }} />
              <p>Drag & drop your file here</p>
              <p className="my-2 text-xs" style={{ color: 'var(--text-muted)' }}>or</p>
              <span className="input inline-flex items-center">Browse Files</span>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Supports: JPG, PNG, PDF</p>
            </div>
          )}
          <input className="hidden" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFile(e.target.files?.[0])} />
        </label>
        <button className="btn-primary mt-4 flex w-full items-center justify-center gap-2" disabled={!file || loading} onClick={analyze}>{loading ? '🤖 Analyzing with Gemini Vision...' : <><Sparkles size={17} /> Analyze Report</>}</button>
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Recent Analyses</h3>
          <div className="mt-2 space-y-2">{recent.map((r, i) => <button key={i} className="flex w-full items-center justify-between rounded-lg border p-2 text-left text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => setResult(r)}><span><StatusBadge>{r.analysis_type}</StatusBadge> {r.filename}</span><span style={{ color: 'var(--text-muted)' }}>View</span></button>)}</div>
        </div>
      </section>
      <section>
        {!result ? <EmptyState icon={<FileSearch size={40} />} title="Upload a report to see AI analysis" message="Gemini Vision reads medical images and documents, then returns a structured clinical summary." /> : <div className="card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-heading text-xl font-semibold"><CheckCircle2 className="text-emerald-400" /> Analysis Complete</h2><div className="flex gap-2"><StatusBadge>Analyzed by Gemini Vision</StatusBadge><StatusBadge>{result.analysis_type}</StatusBadge></div></div><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl p-4 text-sm leading-7" style={{ background: 'var(--bg-secondary)' }}>{result.analysis}</pre><div className="mt-4 flex gap-3"><button className="input flex items-center gap-2 px-4" onClick={() => navigator.clipboard.writeText(result.analysis).then(() => toast.success('Copied'))}><Copy size={16} /> Copy Analysis</button><button className="input flex items-center gap-2 px-4" onClick={download}><Download size={16} /> Download as .txt</button><button className="input px-4" onClick={() => { setResult(null); setFile(null) }}>Analyze Another Report</button></div></div>}
      </section>
    </div>
  )
}