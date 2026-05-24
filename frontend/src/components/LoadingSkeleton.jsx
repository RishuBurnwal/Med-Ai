function Block({ className = '' }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ background: 'var(--border)' }} />
}

export default function LoadingSkeleton({ type = 'card' }) {
  if (type === 'full') {
    return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>
  }
  if (type === 'table') {
    return (
      <div className="card p-5">
        <Block className="mb-5 h-8 w-1/3" />
        {[1, 2, 3, 4, 5].map((row) => <Block key={row} className="mb-3 h-11 w-full" />)}
      </div>
    )
  }
  if (type === 'chat') {
    return <div className="space-y-4">{[1, 2, 3].map((row) => <Block key={row} className={`h-16 w-2/3 ${row % 2 ? '' : 'ml-auto'}`} />)}</div>
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((row) => <Block key={row} className="h-32" />)}</div>
}
