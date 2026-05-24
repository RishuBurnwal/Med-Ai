const providers = [
  { id: 'groq', label: 'Groq', subtitle: 'LLaMA 3.1 - Fastest', icon: '⚡' },
  { id: 'gemini', label: 'Gemini', subtitle: '1.5 Flash - Versatile', icon: '✦' },
  { id: 'openrouter', label: 'OpenRouter', subtitle: 'Mistral 7B - Free', icon: '◈' },
  { id: 'nvidia', label: 'NVIDIA NIM', subtitle: 'LLaMA 3.1 - Powerful', icon: '⬡' }
]

export default function ModelSelector({ value = 'groq', onChange }) {
  return (
    <label className="block w-[180px]">
      <span className="mb-1 block text-[11px]" style={{ color: 'var(--text-muted)' }}>AI Provider</span>
      <select className="input h-10 w-full text-sm" value={value} onChange={(event) => onChange?.(event.target.value)}>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.icon} {provider.label}
          </option>
        ))}
      </select>
      <span className="mt-1 block truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {providers.find((provider) => provider.id === value)?.subtitle}
      </span>
    </label>
  )
}
