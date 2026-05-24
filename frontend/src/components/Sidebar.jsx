import { BarChart3, Bed, Building2, CalendarDays, DollarSign, FileSearch, FlaskConical, LayoutDashboard, LogOut, MessageSquare, Pill, Plus, Settings, Shield, Stethoscope, UserCog, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { initials } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'

const mainItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', role: 'admin' },
  { icon: LayoutDashboard, label: 'Doctor Dashboard', path: '/doctor-dashboard', role: 'doctor' },
  { icon: Users, label: 'Patients', path: '/patients' },
  { icon: CalendarDays, label: 'Appointments', path: '/appointments' },
]

const mgmtItems = [
  { icon: UserCog, label: 'Staff', path: '/staff' },
  { icon: Building2, label: 'Departments', path: '/departments' },
  { icon: Bed, label: 'Wards & Beds', path: '/wards' },
  { icon: DollarSign, label: 'Billing', path: '/billing' },
  { icon: FlaskConical, label: 'Lab Tests', path: '/lab-tests' },
  { icon: Shield, label: 'Users', path: '/users' },
]

const aiItems = [
  { icon: MessageSquare, label: 'AI Chatbot', path: '/chatbot', badge: 'AI' },
  { icon: FileSearch, label: 'Report Analyzer', path: '/report-analyzer', badge: 'AI' },
  { icon: Pill, label: 'Drug Checker', path: '/drug-checker', badge: 'AI' },
  { icon: Stethoscope, label: 'Clinical Support', path: '/clinical-support', badge: 'AI' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' }
]

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  return (
    <>
      {open && <button aria-label="Close sidebar" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside className={`fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg text-white" style={{ background: 'var(--accent-blue)' }}><Plus aria-hidden="true" size={24} strokeWidth={3} /></div>
            <div>
              <h1 className="font-heading text-xl font-bold">MedAI</h1>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Hospital Ecosystem</p>
            </div>
          </div>
        </div>
        <div className="mx-5 h-px" style={{ background: 'var(--border)' }} />
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {/* Main */}
          <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Main</p>
          {mainItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${isActive ? 'border-l-[3px] border-blue-500 bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:bg-[var(--bg-card-hover)]'}`}
              >
                <Icon aria-hidden="true" size={18} />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            )
          })}

          {/* Hospital Management */}
          <p className="mb-1 mt-4 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hospital Management</p>
          {mgmtItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${isActive ? 'border-l-[3px] border-blue-500 bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:bg-[var(--bg-card-hover)]'}`}
              >
                <Icon aria-hidden="true" size={18} />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            )
          })}

          {/* AI Features */}
          <p className="mb-1 mt-4 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>AI Features</p>
          {aiItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${isActive ? 'border-l-[3px] border-blue-500 bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:bg-[var(--bg-card-hover)]'}`}
              >
                <Icon aria-hidden="true" size={18} />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="rounded border border-emerald-400/30 bg-emerald-400/15 px-[5px] py-[1px] text-[9px] font-semibold text-emerald-400">{item.badge}</span>}
              </NavLink>
            )
          })}
        </nav>
        <div className="p-4">
          <div className="mb-4 h-px" style={{ background: 'var(--border)' }} />
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: 'var(--accent-blue)' }} aria-hidden="true">{initials(user?.name)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || 'Hospital Admin'}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                user?.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                user?.role === 'doctor' ? 'bg-blue-500/20 text-blue-400' :
                user?.role === 'patient' ? 'bg-green-500/20 text-green-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>{user?.role || 'admin'}</span>
            </div>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'text-blue-400' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          >
            <Settings aria-hidden="true" size={16} /> Settings
          </NavLink>
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:text-red-400" style={{ color: 'var(--text-muted)' }} onClick={logout}>
            <LogOut aria-hidden="true" size={16} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
