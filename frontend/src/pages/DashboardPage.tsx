
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import IconoCuadro from '../components/IconoCuadro'


import {
  AlertTriangle,
  Pill,
  ShoppingCart,
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
  const [, setCargandoUsuario] = useState(true)

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
    if (!usuario || usuario.rol !== 'administrador') return

    let montado = true
    const cargarUsuarios = async () => {
      try {
        const datosUsuarios = await getUsuarios()
        if (montado) {
          setUsuarios(datosUsuarios)
          setErrorUsuarios(false)
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error)
        if (montado) setErrorUsuarios(true)
      } finally {
        if (montado) setCargandoUsuarios(false)
      }
    }

    void cargarUsuarios()
    return () => {
      montado = false
    }
  }, [usuario])

  // ======================================
  // Dashboard
  // ======================================

  const esAdmin = usuario?.rol === 'administrador'

  const tarjetaKpi =
    'rounded-xl border border-app-border bg-app-card p-5 shadow-sm'
  const iconoKpi = 'mb-4'

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">
              Panel principal
            </h2>

            <p className="mt-2 text-app-muted">
              Resumen general de Farmacia Díaz
            </p>
          </div>

          {/* Tarjetas de indicadores */}

          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <article className={tarjetaKpi}>
              <IconoCuadro icono={Pill} color="#1680C4" className={iconoKpi} />
              <p className="text-sm font-medium text-app-muted">Medicamentos</p>
              <p className="mt-2 text-3xl font-bold">
                {cargandoMedicamentos
                  ? '...'
                  : errorMedicamentos
                    ? '--'
                    : medicamentos.length}
              </p>
            </article>

            <article className={tarjetaKpi}>
              <IconoCuadro icono={ShoppingCart} color="#16A36A" className={iconoKpi} />
              <p className="text-sm font-medium text-app-muted">Ventas</p>
              <p className="mt-2 text-3xl font-bold">
                {cargandoVentas
                  ? '...'
                  : errorVentas
                    ? '--'
                    : ventas.length}
              </p>
            </article>

            <article className={tarjetaKpi}>
              <IconoCuadro icono={AlertTriangle} color="#E5A000" className={iconoKpi} />
              <p className="text-sm font-medium text-app-muted">Alertas</p>
              <p className="mt-2 text-3xl font-bold">
                {cargandoAlertas
                  ? '...'
                  : errorAlertas
                    ? '--'
                    : alertas.length}
              </p>
            </article>

            {esAdmin && (
              <article className={tarjetaKpi}>
                <IconoCuadro icono={Users} color="#7B68C8" className={iconoKpi} />
                <p className="text-sm font-medium text-app-muted">Usuarios</p>
                <p className="mt-2 text-3xl font-bold">
                  {cargandoUsuarios
                    ? '...'
                    : errorUsuarios
                      ? '--'
                      : usuarios.length}
                </p>
              </article>
            )}
          </section>
    </div>
  )
}

export default DashboardPage
