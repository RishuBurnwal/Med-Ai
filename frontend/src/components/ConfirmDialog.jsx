import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', onConfirm, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/15 text-red-400"><AlertTriangle size={20} /></div>
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
          </div>
          <button aria-label="Close confirmation dialog" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="input px-4" onClick={onClose}>Cancel</button>
          <button className="btn-primary bg-red-500" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
