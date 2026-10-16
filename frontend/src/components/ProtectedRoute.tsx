import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getUsuarioActual, type RolUsuario } from '../services/authService'
import AppLayout from './AppLayout'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: RolUsuario
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const accessToken = localStorage.getItem('accessToken')
  const [rol, setRol] = useState<RolUsuario | null>(null)
  const [sesionInvalida, setSesionInvalida] = useState(false)

  // Derivado para que sea correcto al reutilizarse la instancia entre rutas.
  const cargandoRol = Boolean(requiredRole) && rol === null && !sesionInvalida

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
    return (
      <AppLayout>
        <main className="p-8 text-center text-app-muted">Verificando permisos...</main>
      </AppLayout>
    )
  }

  if (requiredRole && rol !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <AppLayout>{children}</AppLayout>
}

export default ProtectedRoute