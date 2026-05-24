export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        },
        medical: {
          green: '#10b981',
          red: '#ef4444',
          yellow: '#f59e0b'
        },
        medai: {
          bg: '#0f1117',
          secondary: '#161b27',
          card: '#1e2535',
          border: '#2a3347'
        }
      },
      fontFamily: {
        heading: ['DM Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}
