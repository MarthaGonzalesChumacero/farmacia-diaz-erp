import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getUsuarioActual, type RolUsuario } from '../services/authService'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: RolUsuario
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const accessToken = localStorage.getItem('accessToken')
  const [rol, setRol] = useState<RolUsuario | null>(null)
  const [cargandoRol, setCargandoRol] = useState(Boolean(requiredRole))
  const [sesionInvalida, setSesionInvalida] = useState(false)

  useEffect(() => {
    if (!requiredRole || !accessToken) return

    let montado = true
    getUsuarioActual()
      .then((usuario) => {
        if (montado) setRol(usuario.rol)
      })
      .catch(() => {
        if (montado) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setSesionInvalida(true)
        }
      })
      .finally(() => {
        if (montado) setCargandoRol(false)
      })

    return () => {
      montado = false
    }
  }, [accessToken, requiredRole])

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (sesionInvalida) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && cargandoRol) {
    return <main className="p-8 text-center text-slate-500">Verificando permisos...</main>
  }

  if (requiredRole && rol !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute