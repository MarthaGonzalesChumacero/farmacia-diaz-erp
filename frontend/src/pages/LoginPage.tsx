
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, User } from 'lucide-react'
import axios from 'axios'

import { login } from '../services/authService'
import ThemeToggle from '../components/ThemeToggle'
import Logo from '../components/Logo'

function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const tokens = await login({
        username: username.trim(),
        password,
      })

      localStorage.setItem('accessToken', tokens.access)
      localStorage.setItem('refreshToken', tokens.refresh)

      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      console.error('Error al iniciar sesión:', err)

      if (axios.isAxiosError(err)) {
        const status = err.response?.status

        if (!err.response) {
          setError(
            'No se pudo conectar con el servidor de usuarios. Verifica que Django esté funcionando.'
          )
        } else if (status === 401) {
          setError(
            'El servidor rechazó las credenciales. Error 401.'
          )
        } else if (status === 400) {
          setError(
            'El servidor no pudo validar los datos de acceso. Error 400.'
          )
        } else if (status === 403) {
          setError(
            'Acceso denegado por el servidor. Error 403.'
          )
        } else {
          setError(
            `Error del servidor: ${status ?? 'desconocido'}. Revisa la consola.`
          )
        }
      } else {
        setError(
          'Ocurrió un error inesperado al iniciar sesión.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-app-bg px-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <section className="w-full max-w-md rounded-2xl border border-app-border bg-app-card p-8 shadow-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-fit">
            <Logo className="h-36 w-auto" />
          </div>

          <h1 className="sr-only">
            Farmacia Díaz
          </h1>

          <p className="mt-2 text-sm text-app-muted">
            Sistema ERP de gestión farmacéutica
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-app-text"
            >
              Usuario
            </label>

            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Ingrese su usuario"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-app-border bg-app-bg py-3 pl-11 pr-4 text-app-text outline-none transition placeholder:text-app-muted focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-app-text"
            >
              Contraseña
            </label>

            <div className="relative">
              <LockKeyhole
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-app-border bg-app-bg py-3 pl-11 pr-12 text-app-text outline-none transition placeholder:text-app-muted focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-app-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#003F63] px-4 py-3 font-semibold text-white transition hover:bg-[#00507d] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#83C441] dark:text-[#081724] dark:hover:bg-[#95d155]"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-app-muted">
          ERP Farmacia Díaz · Gestión 2026
        </p>
      </section>
    </main>
  )
}

export default LoginPage
