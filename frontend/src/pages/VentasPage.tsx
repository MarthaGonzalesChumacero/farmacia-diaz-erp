import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, RefreshCw, RotateCcw, ShoppingCart } from 'lucide-react'

import {
  crearVenta,
  getVentas,
  type Venta,
} from '../services/ventasService'

function obtenerMensaje(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const datos = error.response?.data as
      | { detalle?: unknown; detail?: unknown }
      | undefined
    const detalle = datos?.detalle ?? datos?.detail
    if (typeof detalle === 'string') return detalle
    if (Array.isArray(detalle)) return detalle.join(', ')
    if (error.response?.status === 503) {
      return 'Inventario no está disponible. La venta sigue pendiente y puede reintentarse.'
    }
  }
  return 'No se pudo completar la operación.'
}

function VentasPage() {
  const navigate = useNavigate()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [reintentando, setReintentando] = useState<number | null>(null)

  async function cargarVentas() {
    setActualizando(true)
    setError('')
    try {
      setVentas(await getVentas())
    } catch (err) {
      setError(obtenerMensaje(err))
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  useEffect(() => {
    let montado = true

    getVentas()
      .then((lista) => {
        if (montado) setVentas(lista)
      })
      .catch((err: unknown) => {
        if (montado) setError(obtenerMensaje(err))
      })
      .finally(() => {
        if (montado) setCargando(false)
      })

    return () => {
      montado = false
    }
  }, [])

  async function reintentar(venta: Venta) {
    setReintentando(venta.id)
    setError('')
    setMensaje('')
    try {
      await crearVenta({
        referencia: venta.referencia,
        observacion: venta.observacion,
        detalles: venta.detalles.map((detalle) => ({
          medicamento_id: detalle.medicamento_id,
          medicamento_nombre: detalle.medicamento_nombre,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
        })),
      })
      setMensaje(`Venta ${venta.referencia} completada.`)
      await cargarVentas()
    } catch (err) {
      setError(obtenerMensaje(err))
    } finally {
      setReintentando(null)
    }
  }

  return (
    <main className="bg-app-bg">
      <header className="border-b border-app-border bg-app-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              aria-label="Volver al panel"
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg"
            >
              <ArrowLeft size={21} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-app-text">Ventas</h1>
              <p className="text-sm text-app-muted">Farmacia Díaz ERP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/ventas/registrar')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
          >
            <ShoppingCart size={18} />
            Nueva venta
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-app-text">Historial de ventas</h2>
            <p className="mt-1 text-sm text-app-muted">Consulta estados, detalles y totales.</p>
          </div>
          <button
            type="button"
            onClick={() => void cargarVentas()}
            disabled={actualizando}
            aria-label="Actualizar historial"
            title="Actualizar historial"
            className="rounded-lg border border-app-border bg-app-card p-2.5 text-app-text hover:bg-app-bg disabled:opacity-50"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}

        <div className="overflow-hidden rounded-xl border border-app-border bg-app-card">
          {cargando ? (
            <p className="p-8 text-center text-app-muted">Cargando ventas...</p>
          ) : ventas.length === 0 ? (
            <p className="p-8 text-center text-app-muted">Todavía no hay ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-app-bg text-app-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Referencia / fecha</th>
                    <th className="px-5 py-3 font-semibold">Detalle</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {ventas.map((venta) => (
                    <tr key={venta.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-app-text">{venta.referencia}</p>
                        <p className="mt-1 text-xs text-app-muted">
                          {new Date(venta.fecha_venta).toLocaleString('es-BO')}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-app-text">
                        {venta.detalles.map((detalle) => (
                          <p key={detalle.id}>
                            {detalle.cantidad} × {detalle.medicamento_nombre}
                          </p>
                        ))}
                      </td>
                      <td className="px-5 py-4 font-semibold text-app-text">Bs {venta.total}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          venta.estado === 'completada'
                            ? 'bg-emerald-100 text-emerald-800'
                            : venta.estado === 'pendiente'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-app-bg text-app-text'
                        }`}>
                          {venta.estado}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {venta.estado === 'pendiente' && (
                          <button
                            type="button"
                            onClick={() => void reintentar(venta)}
                            disabled={reintentando === venta.id}
                            title="Reintentar venta pendiente"
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                          >
                            <RotateCcw size={16} />
                            {reintentando === venta.id ? 'Reintentando' : 'Reintentar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default VentasPage