import { Bell, Calendar, ChevronDown, Clock3, Menu, Moon, Palette, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { initials } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'

const titles = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/chatbot': 'MedAssist AI',
  '/report-analyzer': 'Report Analyzer',
  '/drug-checker': 'Drug Checker',
  '/clinical-support': 'Clinical Support',
  '/analytics': 'Analytics'
}

const zones = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore']

function AnalogClock({ date, color = 'var(--accent-blue)' }) {
  const seconds = date.getSeconds()
  const minutes = date.getMinutes()
  const hours = date.getHours() % 12
  const s = seconds * 6
  const m = minutes * 6 + seconds * 0.1
  const h = hours * 30 + minutes * 0.5
  return (
    <div className="relative h-10 w-10 rounded-full border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <span className="absolute left-1/2 top-1/2 h-[2px] w-[13px] origin-left rounded" style={{ background: color, transform: `rotate(${h - 90}deg)` }} />
      <span className="absolute left-1/2 top-1/2 h-[2px] w-[16px] origin-left rounded bg-slate-300" style={{ transform: `rotate(${m - 90}deg)` }} />
      <span className="absolute left-1/2 top-1/2 h-px w-[17px] origin-left rounded bg-red-400" style={{ transform: `rotate(${s - 90}deg)` }} />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: color }} />
    </div>
  )
}

export default function Topbar({ onMenu }) {
  const location = useLocation()
  const { user } = useAuth()
  const [now, setNow] = useState(new Date())
  const [theme, setTheme] = useState(localStorage.getItem('medai_theme') || 'night')
  const [dimness, setDimness] = useState(Number(localStorage.getItem('medai_dimness') || 1))
  const [timezone, setTimezone] = useState(localStorage.getItem('medai_timezone') || 'Asia/Kolkata')
  const [clockMode, setClockMode] = useState(localStorage.getItem('medai_clock_mode') || 'digital')
  const [clockColor, setClockColor] = useState(localStorage.getItem('medai_clock_color') || '#3b82f6')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'day' ? 'day' : 'night'
    document.documentElement.style.setProperty('--theme-dimness', String(dimness))
    localStorage.setItem('medai_theme', theme)
    localStorage.setItem('medai_dimness', String(dimness))
    localStorage.setItem('medai_timezone', timezone)
    localStorage.setItem('medai_clock_mode', clockMode)
    localStorage.setItem('medai_clock_color', clockColor)
  }, [theme, dimness, timezone, clockMode, clockColor])

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/patients/')) return 'Patient Detail'
    return titles[location.pathname] || 'Page'
  }, [location.pathname])

  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: timezone }).format(now)
  const date = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: timezone }).format(now)

  return (
    <header className="fixed right-0 top-0 z-20 flex h-[60px] items-center justify-between border-b px-4 lg:left-[260px]" style={{ left: 'var(--sidebar-width)', background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <button aria-label="Open navigation menu" className="icon-btn lg:hidden" onClick={onMenu}><Menu size={18} /></button>
        <div className="font-heading text-xl font-semibold" aria-label={`Current page: ${pageTitle}`}>{pageTitle}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-xs md:flex" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <Calendar size={14} style={{ color: 'var(--accent-blue)' }} />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          {clockMode === 'analog' ? <AnalogClock date={now} color={clockColor} /> : <Clock3 size={16} style={{ color: clockColor }} />}
          <span className="font-mono text-sm">{time}</span>
        </div>
        <div className="relative">
          <button aria-label="Customize appearance settings" className="icon-btn w-auto gap-2 px-3" onClick={() => setOpen((value) => !value)}>
            <Palette size={16} /><ChevronDown size={14} />
          </button>
          {open && (
            <div className="card absolute right-0 mt-2 w-72 p-4">
              <div className="mb-3 flex gap-2">
                <button className={`input flex-1 ${theme === 'day' ? 'border-blue-500' : ''}`} onClick={() => setTheme('day')}><Sun size={14} className="inline" /> Day</button>
                <button className={`input flex-1 ${theme === 'night' ? 'border-blue-500' : ''}`} onClick={() => setTheme('night')}><Moon size={14} className="inline" /> Night</button>
              </div>
              <label className="mb-3 block text-xs" style={{ color: 'var(--text-secondary)' }}>Darkness control
                <input className="mt-2 w-full" type="range" min="0.72" max="1.12" step="0.02" value={dimness} onChange={(e) => setDimness(Number(e.target.value))} />
              </label>
              <label className="mb-3 block text-xs" style={{ color: 'var(--text-secondary)' }}>Time zone
                <select className="input mt-1 w-full" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                </select>
              </label>
              <label className="mb-3 block text-xs" style={{ color: 'var(--text-secondary)' }}>Clock design
                <select className="input mt-1 w-full" value={clockMode} onChange={(e) => setClockMode(e.target.value)}>
                  <option value="digital">Digital</option>
                  <option value="analog">Analog</option>
                </select>
              </label>
              <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>Clock accent
                <input className="mt-1 h-9 w-full rounded-lg border p-1" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }} type="color" value={clockColor} onChange={(e) => setClockColor(e.target.value)} />
              </label>
            </div>
          )}
        </div>
        <div className="relative hidden sm:block">
          <button aria-label="Notifications" className="icon-btn"><Bell size={17} /></button>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: 'var(--accent-blue)' }}>{initials(user?.name)}</div>
      </div>
    </header>
  )
}
