import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // almacenamiento no disponible: el tema solo aplica a esta sesión
    }
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      className={`flex h-10 w-10 items-center justify-center rounded-lg border border-app-border bg-app-card text-app-muted transition hover:text-app-text focus:outline-none focus:ring-2 focus:ring-brand-green ${className}`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default ThemeToggle
