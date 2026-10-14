
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Pill, User } from 'lucide-react'
import axios from 'axios'

import { login } from '../services/authService'

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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Pill size={32} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Farmacia Díaz
          </h1>

          <p className="mt-2 text-sm text-slate-500">
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
              className="mb-2 block text-sm font-medium text-slate-700"
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
                className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
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
                className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          ERP Farmacia Díaz · Gestión 2026
        </p>
      </section>
    </main>
  )
}

export default LoginPage
