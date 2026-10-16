
import IconoCuadro from '../components/IconoCuadro'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  PackageX,
  RefreshCw,
  RotateCcw,
  Check,
} from 'lucide-react'

import {
  actualizarEstadoAlerta,
  getAlertas,
  verificarAlertasVencimiento,
  type Alerta,
} from '../services/inventarioService'
import { getUsuarioActual } from '../services/authService'

type FiltroAlerta = 'pendientes' | 'revisadas'

function AlertasPage() {
  const navigate = useNavigate()

  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [alertaActualizando, setAlertaActualizando] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<FiltroAlerta>('pendientes')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [esAdministrador, setEsAdministrador] = useState(false)

  async function cargarAlertas() {
    setActualizando(true)
    setError('')

    try {
      const datos = await getAlertas()
      setAlertas(datos)
    } catch (error) {
      console.error('Error al cargar alertas:', error)
      setError('No se pudieron cargar las alertas.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  useEffect(() => {
    let montado = true
    Promise.all([getUsuarioActual(), getAlertas()])
      .then(([usuario, datos]) => {
        if (montado) setEsAdministrador(usuario.rol === 'administrador')
        if (montado) setAlertas(datos)
      })
      .catch((err: unknown) => {
        console.error('Error al cargar alertas:', err)
        if (montado) setError('No se pudieron cargar las alertas.')
      })
      .finally(() => {
        if (montado) setCargando(false)
      })

    return () => {
      montado = false
    }
  }, [])

  const pendientes = alertas.filter(
    (alerta) => !alerta.leida,
  )
  const revisadas = alertas.filter((alerta) => alerta.leida)
  const visibles = filtro === 'pendientes' ? pendientes : revisadas

  const alertasStock = pendientes.filter(
    (alerta) => alerta.tipo === 'stock',
  )

  const alertasVencimiento = pendientes.filter(
    (alerta) => alerta.tipo === 'vencimiento',
  )

  const agotados = alertasStock.filter(
    (alerta) =>
      alerta.mensaje.toLowerCase().includes('agotado'),
  )

  async function cambiarEstado(alerta: Alerta, leida: boolean) {
    setAlertaActualizando(alerta.id)
    setError('')
    setMensaje('')
    try {
      await actualizarEstadoAlerta(alerta.id, leida)
      setAlertas((actuales) =>
        actuales.map((item) =>
          item.id === alerta.id ? { ...item, leida } : item,
        ),
      )
      setMensaje(leida ? 'Alerta marcada como revisada.' : 'Alerta reabierta.')
    } catch {
      setError('No se pudo actualizar el estado de la alerta.')
    } finally {
      setAlertaActualizando(null)
    }
  }

  async function verificarVencimientos() {
    setVerificando(true)
    setError('')
    setMensaje('')
    try {
      await verificarAlertasVencimiento()
      const datos = await getAlertas()
      setAlertas(datos)
      setMensaje('Verificación de vencimientos completada.')
    } catch {
      setError('No se pudo verificar los vencimientos.')
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div className="bg-app-bg">
      <header className="border-b border-app-border bg-app-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-app-text">
              Alertas de inventario
            </h1>
            <p className="mt-1 text-sm text-app-muted">
              Farmacia Díaz ERP
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-lg bg-app-bg px-4 py-2 text-sm font-medium text-app-text hover:bg-app-border"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-app-text">
              Estado de las alertas
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              Consulta las alertas registradas en el sistema.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {esAdministrador && <button
              type="button"
              onClick={() => void verificarVencimientos()}
              disabled={verificando}
              className="flex items-center gap-2 rounded-lg border border-app-border bg-app-card px-4 py-2 text-sm font-semibold text-app-text hover:bg-app-bg disabled:opacity-50"
            >
              <Clock3 size={17} />
              {verificando ? 'Verificando...' : 'Verificar vencimientos'}
            </button>}
            <button
              type="button"
              onClick={() => void cargarAlertas()}
              disabled={actualizando}
              className="flex items-center gap-2 rounded-lg bg-[#00507d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00507d] disabled:opacity-50"
            >
              <RefreshCw size={17} />
              Actualizar
            </button>
          </div>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-app-card p-5 shadow-sm">
            <IconoCuadro icono={AlertTriangle} color="#E5A000" className="mb-3" />
            <p className="text-sm text-app-muted">
              Alertas pendientes
            </p>
            <p className="mt-1 text-3xl font-bold">
              {pendientes.length}
            </p>
          </div>

          <div className="rounded-2xl bg-app-card p-5 shadow-sm">
            <IconoCuadro icono={PackageX} color="#E05252" className="mb-3" />
            <p className="text-sm text-app-muted">
              Medicamentos agotados
            </p>
            <p className="mt-1 text-3xl font-bold">
              {agotados.length}
            </p>
          </div>

          <div className="rounded-2xl bg-app-card p-5 shadow-sm">
            <IconoCuadro icono={AlertTriangle} color="#E05252" className="mb-3" />
            <p className="text-sm text-app-muted">
              Alertas de stock
            </p>
            <p className="mt-1 text-3xl font-bold">
              {alertasStock.length}
            </p>
          </div>

          <div className="rounded-2xl bg-app-card p-5 shadow-sm">
            <Clock3 className="mb-3 text-[#003F63] dark:text-[#83C441]" />
            <p className="text-sm text-app-muted">
              Próximos a vencer
            </p>
            <p className="mt-1 text-3xl font-bold">
              {alertasVencimiento.length}
            </p>
          </div>
          <div className="rounded-2xl bg-app-card p-5 shadow-sm">
            <CheckCircle2 className="mb-3 text-emerald-600" />
            <p className="text-sm text-app-muted">Alertas revisadas</p>
            <p className="mt-1 text-3xl font-bold">{revisadas.length}</p>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}
        {mensaje && (
          <p role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {mensaje}
          </p>
        )}

        <div className="mb-4 flex gap-1 border-b border-app-border">
          {(['pendientes', 'revisadas'] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              aria-pressed={filtro === opcion}
              onClick={() => setFiltro(opcion)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${
                filtro === opcion
                  ? 'border-[#003F63] text-blue-800'
                  : 'border-transparent text-app-muted hover:text-app-text'
              }`}
            >
              {opcion} ({opcion === 'pendientes' ? pendientes.length : revisadas.length})
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="rounded-2xl bg-app-card p-8 text-center text-app-muted">
            Cargando alertas...
          </div>
        ) : visibles.length === 0 && !error ? (
          <div className="rounded-2xl bg-app-card p-10 text-center shadow-sm">
            <CheckCircle2
              size={42}
              className="mx-auto mb-3 text-emerald-600"
            />
            <h3 className="text-lg font-semibold text-app-text">
              No hay alertas {filtro === 'pendientes' ? 'pendientes' : 'revisadas'}
            </h3>
            <p className="mt-2 text-sm text-app-muted">
              No se encontraron alertas en esta vista.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            {visibles.map((alerta) => {
              const esVencimiento =
                alerta.tipo === 'vencimiento'

              const esAgotado =
                alerta.tipo === 'stock' &&
                alerta.mensaje
                  .toLowerCase()
                  .includes('agotado')

              return (
                <article
                  key={alerta.id}
                  className="rounded-2xl border border-app-border bg-app-card p-6 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        esVencimiento
                          ? 'bg-blue-100 text-[#003F63] dark:text-[#83C441]'
                          : esAgotado
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {esVencimiento ? (
                        <Clock3 size={24} />
                      ) : esAgotado ? (
                        <PackageX size={24} />
                      ) : (
                        <AlertTriangle size={24} />
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-app-text">
                        {esVencimiento
                          ? 'Próximo a vencer'
                          : esAgotado
                            ? 'Medicamento agotado'
                            : 'Stock crítico'}
                      </h3>

                      <p className="mt-2 text-sm text-app-muted">
                        {alerta.mensaje}
                      </p>

                      <p className={`mt-3 text-xs font-medium ${alerta.leida ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {alerta.leida ? 'Revisada' : 'Pendiente de revisión'}
                      </p>
                    </div>
                    {esAdministrador && <button
                      type="button"
                      onClick={() => void cambiarEstado(alerta, !alerta.leida)}
                      disabled={alertaActualizando === alerta.id}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-sm font-medium text-app-text hover:bg-app-bg disabled:opacity-50"
                    >
                      {alerta.leida ? <RotateCcw size={16} /> : <Check size={16} />}
                      {alerta.leida ? 'Reabrir' : 'Marcar revisada'}
                    </button>}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}

export default AlertasPage




