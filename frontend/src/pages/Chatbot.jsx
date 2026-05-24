import { Bot, Phone, SendHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import ModelSelector from '../components/ModelSelector'

const initial = { role: 'assistant', content: "Hello! 👋 I'm MedAssist, your AI medical assistant. Describe your symptoms or ask any health question. Remember: I provide general guidance — always consult a doctor for proper diagnosis.", time: new Date(), emergency: false }
const chips = ['🤒 Fever & Headache', '💔 Chest Pain', '😮‍💨 Breathing Difficulty', '🤢 Nausea & Vomiting', '😴 Extreme Fatigue', '🦴 Joint Pain']

export default function Chatbot() {
  const [provider, setProvider] = useState('groq')
  const [messages, setMessages] = useState([initial])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send() {
    if (!text.trim() || loading) return
    const user = { role: 'user', content: text.trim(), time: new Date() }
    setMessages((current) => [...current, user])
    setText('')
    setLoading(true)
    try {
      const history = messages.slice(-10).map(({ role, content }) => ({ role: role === 'assistant' ? 'assistant' : 'user', content }))
      const res = await api.post('/ai/chat', { message: user.content, conversation_history: history, provider })
      setMessages((current) => [...current, { role: 'assistant', content: res.data.reply, emergency: res.data.is_emergency, time: new Date() }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'The AI service is busy. Please try again in a moment or contact the hospital desk for urgent help.', time: new Date(), emergency: false }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card flex h-[calc(100vh-110px)] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-500"><Bot /></div>
          <div>
            <h1 className="font-heading text-xl font-bold">MedAssist AI</h1>
            <p className="text-xs text-emerald-400">● Online</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ModelSelector value={provider} onChange={setProvider} />
          <button aria-label="Clear conversation" className="icon-btn hover:text-red-400" onClick={() => setMessages([initial])}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role !== 'user' && <div className="mr-3 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500"><Bot size={16} /></div>}
            <div className="max-w-[70%]">
              <div className={`rounded-xl p-4 text-sm leading-6 ${m.role === 'user' ? 'rounded-br-none bg-blue-500 text-white' : 'rounded-bl-none border'} ${m.emergency ? 'border-l-4 border-red-500 bg-red-500/5' : ''}`} style={m.role === 'assistant' ? { background: m.emergency ? 'rgba(239,68,68,0.05)' : 'var(--bg-card)', borderColor: 'var(--border)' } : {}}>
                {m.emergency && <div className="mb-2 font-bold text-red-400">⚠️ EMERGENCY — Seek Immediate Help</div>}
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(m.time).toLocaleTimeString()}</p>
              {m.emergency && <a href="tel:108" className="mt-2 flex w-fit items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm text-white"><Phone size={16} /> Call Emergency: 108</a>}
            </div>
          </div>
        ))}
        {loading && <div className="flex items-center gap-2 rounded-xl border p-4 w-fit" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}><span className="h-2 w-2 rounded-full bg-blue-500" style={{ animation: 'bounceDots 1s infinite' }} /><span className="h-2 w-2 rounded-full bg-blue-500" style={{ animation: 'bounceDots 1s .15s infinite' }} /><span className="h-2 w-2 rounded-full bg-blue-500" style={{ animation: 'bounceDots 1s .3s infinite' }} /></div>}
        <div ref={endRef} />
      </div>

      <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-3 flex gap-2 overflow-x-auto">{chips.map((chip) => <button key={chip} className="chip shrink-0 hover:border-blue-400" onClick={() => setText(chip)}>{chip}</button>)}</div>
        <div className="flex gap-3">
          <textarea aria-label="Chat input" className="input min-h-11 flex-1 py-3" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          <button aria-label="Send message" className="btn-primary px-5" disabled={!text.trim() || loading} onClick={send}><SendHorizontal size={18} /></button>
        </div>
        <p className="mt-2 text-[11px] italic" style={{ color: 'var(--text-muted)' }}>MedAssist provides general health information only — not a substitute for professional medical advice</p>
      </div>
    </div>
  )
}
