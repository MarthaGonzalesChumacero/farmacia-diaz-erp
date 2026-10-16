import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react'

import { getUsuarioActual, type UsuarioActual } from '../services/authService'
import { seccionesMenu } from './navegacion'
import ThemeToggle from './ThemeToggle'
import IconoCuadro from './IconoCuadro'
import Logo from './Logo'

const fechaHoy = new Date().toLocaleDateString('es-BO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [usuario, setUsuario] = useState<UsuarioActual | null>(null)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    let montado = true
    getUsuarioActual()
      .then((datos) => {
        if (montado) setUsuario(datos)
      })
      .catch(() => {
        // La sesión inválida la gestionan ProtectedRoute y cada página.
      })
    return () => {
      montado = false
    }
  }, [])

  const esAdmin = usuario?.rol === 'administrador'
  const secciones = seccionesMenu
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.soloAdmin || esAdmin) }))
    .filter((s) => s.items.length > 0)

  // La opción activa es la de la ruta más específica que coincide.
  const activa = seccionesMenu
    .flatMap((s) => s.items)
    .filter((o) => pathname === o.ruta || pathname.startsWith(`${o.ruta}/`))
    .sort((a, b) => b.ruta.length - a.ruta.length)[0]?.ruta
  const enDashboard = pathname === '/dashboard'

  const nombreUsuario =
    usuario?.first_name && usuario?.last_name
      ? `${usuario.first_name} ${usuario.last_name}`
      : usuario?.username

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login', { replace: true })
  }

  const ir = (ruta: string) => {
    setMenuAbierto(false)
    navigate(ruta)
  }

  const claseItem = (activo: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#83C441] ${
      activo
        ? 'bg-[#83C441] font-semibold text-[#003F63]'
        : 'text-nav hover:bg-nav-hover hover:text-app-text'
    }`

  const menu = (
    <>
      <div className="px-6 pb-4 pt-6">
        <Logo className="mx-auto h-28 w-auto" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-app-muted">
          Principal
        </p>

        <button
          type="button"
          onClick={() => ir('/dashboard')}
          aria-current={enDashboard ? 'page' : undefined}
          className={claseItem(enDashboard)}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>

        {secciones.map((seccion) => (
          <div key={seccion.titulo} className="mt-4 border-t border-app-border pt-4">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-app-muted">
              {seccion.titulo}
            </p>

            <div className="space-y-1">
              {seccion.items.map(({ ruta, titulo, icono, color }) => (
                <button
                  key={ruta}
                  type="button"
                  onClick={() => ir(ruta)}
                  aria-current={activa === ruta ? 'page' : undefined}
                  className={claseItem(activa === ruta)}
                >
                  <IconoCuadro icono={icono} color={color} tamano="sm" />
                  {titulo}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  )

  return (
    <div className="min-h-screen bg-app-bg text-app-text lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-app-border bg-app-sidebar text-app-text lg:flex">
        {menu}
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMenuAbierto(false)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-app-border bg-app-sidebar text-app-text">
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 rounded p-1 text-app-muted hover:text-app-text"
            >
              <X size={20} />
            </button>
            {menu}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-app-border bg-app-card">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMenuAbierto(true)}
                aria-label="Abrir menú"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-app-border text-app-muted hover:text-app-text"
              >
                <Menu size={20} />
              </button>
              <p className="font-bold">Farmacia Díaz</p>
            </div>

            <p className="hidden text-sm capitalize text-app-muted lg:block">
              {fechaHoy}
            </p>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <div className="hidden items-center gap-3 sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-app-bg text-app-muted">
                  <User size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {usuario ? nombreUsuario : 'Cargando...'}
                  </p>

                  {usuario && (
                    <p className="text-xs text-app-muted">
                      {esAdmin ? 'Administrador' : 'Auxiliar'}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="flex h-10 items-center gap-2 rounded-lg border border-app-border bg-app-card px-3 text-sm font-medium text-app-text transition hover:border-[#83C441] focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

        <div>{children}</div>
      </div>
    </div>
  )
}

export default AppLayout
