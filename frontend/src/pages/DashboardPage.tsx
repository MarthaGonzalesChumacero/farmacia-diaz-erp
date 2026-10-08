
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AlertTriangle,
  Boxes,
  LogOut,
  PackageSearch,
  Pill,
  ShoppingCart,
  User,
  Users,
} from 'lucide-react'

import {
  getUsuarioActual,
  getUsuarios,
  type UsuarioActual,
} from '../services/authService'

import {
  getMedicamentos,
  getAlertas,
  type Medicamento,
  type Alerta,
} from '../services/inventarioService'

import {
  getVentas,
  type Venta,
} from '../services/ventasService'

function DashboardPage() {
  const navigate = useNavigate()

  // ======================================
  // Usuario autenticado
  // ======================================

  const [usuario, setUsuario] = useState<UsuarioActual | null>(null)
  const [cargandoUsuario, setCargandoUsuario] = useState(true)

  // ======================================
  // Medicamentos
  // ======================================

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [cargandoMedicamentos, setCargandoMedicamentos] = useState(true)
  const [errorMedicamentos, setErrorMedicamentos] = useState(false)

  // ======================================
  // Ventas
  // ======================================

  const [ventas, setVentas] = useState<Venta[]>([])
  const [cargandoVentas, setCargandoVentas] = useState(true)
  const [errorVentas, setErrorVentas] = useState(false)

  // ======================================
  // Alertas
  // ======================================

  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargandoAlertas, setCargandoAlertas] = useState(true)
  const [errorAlertas, setErrorAlertas] = useState(false)

  // ======================================
  // Usuarios registrados
  // ======================================

  const [usuarios, setUsuarios] = useState<UsuarioActual[]>([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [errorUsuarios, setErrorUsuarios] = useState(false)

  // ======================================
  // Cargar usuario autenticado
  // ======================================

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const datosUsuario = await getUsuarioActual()
        setUsuario(datosUsuario)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        navigate('/login', { replace: true })
      } finally {
        setCargandoUsuario(false)
      }
    }

    void cargarUsuario()
  }, [navigate])

  // ======================================
  // Cargar medicamentos
  // ======================================

  useEffect(() => {
    const cargarMedicamentos = async () => {
      try {
        const datosMedicamentos = await getMedicamentos()
        setMedicamentos(datosMedicamentos)
        setErrorMedicamentos(false)
      } catch (error) {
        console.error('Error al cargar medicamentos:', error)
        setErrorMedicamentos(true)
      } finally {
        setCargandoMedicamentos(false)
      }
    }

    void cargarMedicamentos()
  }, [])

  // ======================================
  // Cargar ventas
  // ======================================

  useEffect(() => {
    const cargarVentas = async () => {
      try {
        const datosVentas = await getVentas()
        setVentas(datosVentas)
        setErrorVentas(false)
      } catch (error) {
        console.error('Error al cargar ventas:', error)
        setErrorVentas(true)
      } finally {
        setCargandoVentas(false)
      }
    }

    void cargarVentas()
  }, [])

  // ======================================
  // Cargar alertas
  // ======================================

  useEffect(() => {
    const cargarAlertas = async () => {
      try {
        const datosAlertas = await getAlertas()
        setAlertas(datosAlertas)
        setErrorAlertas(false)
      } catch (error) {
        console.error('Error al cargar alertas:', error)
        setErrorAlertas(true)
      } finally {
        setCargandoAlertas(false)
      }
    }

    void cargarAlertas()
  }, [])

  // ======================================
  // Cargar usuarios registrados
  // ======================================

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const datosUsuarios = await getUsuarios()
        setUsuarios(datosUsuarios)
        setErrorUsuarios(false)
      } catch (error) {
        console.error('Error al cargar usuarios:', error)
        setErrorUsuarios(true)
      } finally {
        setCargandoUsuarios(false)
      }
    }

    void cargarUsuarios()
  }, [])

  // ======================================
  // Cerrar sesión
  // ======================================

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')

    navigate('/login', { replace: true })
  }

  const nombreUsuario =
    usuario?.first_name && usuario?.last_name
      ? `${usuario.first_name} ${usuario.last_name}`
      : usuario?.username

  const rolUsuario =
    usuario?.rol === 'administrador'
      ? 'Administrador'
      : 'Auxiliar'

  // ======================================
  // Dashboard
  // ======================================

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Pill size={25} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Farmacia Díaz
              </h1>

              <p className="text-sm text-slate-500">
                Sistema ERP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <User size={20} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {cargandoUsuario
                    ? 'Cargando...'
                    : nombreUsuario}
                </p>

                {!cargandoUsuario && usuario && (
                  <p className="text-xs text-slate-500">
                    {rolUsuario}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Panel principal
          </h2>

          <p className="mt-2 text-slate-500">
            Resumen general de Farmacia Díaz
          </p>
        </div>

        {/* Tarjetas de indicadores */}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* Medicamentos */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Pill size={23} />
            </div>

            <p className="text-sm font-medium text-slate-500">
              Medicamentos
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {cargandoMedicamentos
                ? '...'
                : errorMedicamentos
                  ? '--'
                  : medicamentos.length}
            </p>
          </article>

          {/* Ventas */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <ShoppingCart size={23} />
            </div>

            <p className="text-sm font-medium text-slate-500">
              Ventas
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {cargandoVentas
                ? '...'
                : errorVentas
                  ? '--'
                  : ventas.length}
            </p>
          </article>

          {/* Alertas */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle size={23} />
            </div>

            <p className="text-sm font-medium text-slate-500">
              Alertas
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {cargandoAlertas
                ? '...'
                : errorAlertas
                  ? '--'
                  : alertas.length}
            </p>
          </article>

          {/* Usuarios */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Users size={23} />
            </div>

            <p className="text-sm font-medium text-slate-500">
              Usuarios
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {cargandoUsuarios
                ? '...'
                : errorUsuarios
                  ? '--'
                  : usuarios.length}
            </p>
          </article>
        </section>

        {/* Módulos del sistema */}

        <section className="mt-8">
          <h3 className="mb-4 text-xl font-bold text-slate-900">
            Módulos del sistema
          </h3>

          <div className="grid gap-5 md:grid-cols-3">

            {/* Inventario: tarjeta con navegación */}

            <article
              role="link"
              tabIndex={0}
              onClick={() => navigate('/inventario')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate('/inventario')
                }
              }}
              className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Boxes
                className="mb-4 text-blue-600"
                size={30}
              />

              <h4 className="text-lg font-semibold text-slate-900">
                Inventario
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Medicamentos, lotes, stock y movimientos.
              </p>
            </article>

            {/* Ventas */}

            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <ShoppingCart
                className="mb-4 text-emerald-600"
                size={30}
              />

              <h4 className="text-lg font-semibold text-slate-900">
                Ventas
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Registro y consulta de ventas realizadas.
              </p>
            </article>

            {/* Control de stock */}

            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <PackageSearch
                className="mb-4 text-amber-600"
                size={30}
              />

              <h4 className="text-lg font-semibold text-slate-900">
                Control de stock
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Stock crítico y medicamentos próximos a vencer.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
