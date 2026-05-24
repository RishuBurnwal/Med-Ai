export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="card grid min-h-[260px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-blue)' }}>
          {icon}
        </div>
        <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
        {message && <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}
