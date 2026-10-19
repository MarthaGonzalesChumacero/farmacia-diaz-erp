import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  Barcode,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'

import {
  getLote,
  getLotes,
  getMedicamento,
  getMedicamentoPorCodigo,
  getMedicamentos,
  type Lote,
  type Medicamento,
} from '../services/inventarioService'
import {
  crearVenta,
  type NuevaVenta,
  type NuevoDetalleVenta,
} from '../services/ventasService'
import BarcodeScanner from '../components/BarcodeScanner'
import { identificarCodigo } from '../lib/identificarCodigo'

interface LineaCarrito extends NuevoDetalleVenta {
  stock_disponible: number
}

function fechaLocal(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

function nuevaReferencia(): string {
  const sufijo = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `V-${Date.now()}-${sufijo}`
}

function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const datos = error.response?.data as
      | { detalle?: unknown; detail?: unknown }
      | undefined
    const detalle = datos?.detalle ?? datos?.detail

    if (typeof detalle === 'string') return detalle
    if (Array.isArray(detalle)) return detalle.join(', ')
    if (error.response?.status === 503) {
      return 'Inventario no respondió. La venta quedó pendiente; reintenta con la misma referencia.'
    }
    return 'No se pudo registrar la venta. Revisa los datos e inténtalo nuevamente.'
  }

  return 'Ocurrió un error inesperado al registrar la venta.'
}

function RegistrarVentaPage() {
  const navigate = useNavigate()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [medicamentoId, setMedicamentoId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [observacion, setObservacion] = useState('')
  const [referencia, setReferencia] = useState(nuevaReferencia)
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Estado del escáner de códigos
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [lectorId, setLectorId] = useState(0)
  const [procesandoEscaneo, setProcesandoEscaneo] = useState(false)
  const [codigoManual, setCodigoManual] = useState('')

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        const [listaMedicamentos, listaLotes] = await Promise.all([
          getMedicamentos(),
          getLotes(),
        ])
        setMedicamentos(listaMedicamentos.filter((item) => item.activo))
        setLotes(listaLotes)
      } catch {
        setError('No se pudo cargar el catálogo y las existencias.')
      } finally {
        setCargando(false)
      }
    }

    void cargarCatalogo()
  }, [])

  const hoy = fechaLocal()
  const lotesDisponibles = (id: number) =>
    lotes
      .filter(
        (lote) =>
          lote.medicamento === id &&
          lote.activo &&
          lote.cantidad_actual > 0 &&
          lote.fecha_vencimiento >= hoy,
      )
      .sort((a, b) =>
        a.fecha_vencimiento.localeCompare(b.fecha_vencimiento),
      )

  const stockPorMedicamento = (id: number) =>
    lotesDisponibles(id).reduce(
      (total, lote) => total + lote.cantidad_actual,
      0,
    )

  function agregarMedicamento(
    med: Medicamento,
    unidades: number,
    esEscaneo = false,
  ): boolean {
    if (!med.activo) {
      setError(`El medicamento "${med.nombre}" está inactivo y no se puede vender.`)
      return false
    }

    const lotesElegibles = lotesDisponibles(med.id)
    const stockDisponible = stockPorMedicamento(med.id)

    if (stockDisponible <= 0 || lotesElegibles.length === 0) {
      setError(`El medicamento "${med.nombre}" no tiene stock disponible para la venta.`)
      return false
    }

    const unidadesEnCarrito =
      carrito.find((item) => item.medicamento_id === med.id)?.cantidad ?? 0

    if (unidadesEnCarrito + unidades > stockDisponible) {
      setError(
        `Stock insuficiente para "${med.nombre}". Disponible: ${stockDisponible}${
          unidadesEnCarrito > 0 ? ` (ya tienes ${unidadesEnCarrito} en la venta)` : ''
        }.`,
      )
      return false
    }

    const lotePrecio = lotesElegibles[0]
    const precioUnitario = Number(lotePrecio.precio_venta).toFixed(2)
    const nuevaCantidad = unidadesEnCarrito + unidades
    const nuevoSubtotal = (nuevaCantidad * Number(precioUnitario)).toFixed(2)

    setCarrito((actual) => {
      const existente = actual.find((item) => item.medicamento_id === med.id)
      if (existente) {
        return actual.map((item) =>
          item.medicamento_id === med.id
            ? { ...item, cantidad: item.cantidad + unidades }
            : item,
        )
      }

      return [
        ...actual,
        {
          medicamento_id: med.id,
          medicamento_nombre: med.nombre,
          cantidad: unidades,
          precio_unitario: precioUnitario,
          stock_disponible: stockDisponible,
        },
      ]
    })

    setError('')
    if (esEscaneo) {
      setExito(
        `Agregado por escaneo: ${med.nombre} · 1 unidad (Bs ${precioUnitario}) · Subtotal: Bs ${nuevoSubtotal}`,
      )
    } else {
      setExito('')
    }
    return true
  }

  const agregarAlCarrito = () => {
    const id = Number(medicamentoId)
    const unidades = Number(cantidad)
    const medicamento = medicamentos.find((item) => item.id === id)

    if (!medicamento || !Number.isInteger(unidades) || unidades < 1) {
      setError('Selecciona un medicamento y una cantidad válida.')
      return
    }

    agregarMedicamento(medicamento, unidades, false)
  }

  async function procesarCodigoEscaneado(valor: string) {
    const limpio = valor.trim()
    if (!limpio || procesandoEscaneo) return

    setProcesandoEscaneo(true)
    setError('')
    setExito('')

    try {
      const identificacion = await identificarCodigo(limpio, {
        getMedicamento,
        getLote,
        getMedicamentoPorCodigo,
      })

      let med: Medicamento | null = null

      if (identificacion.tipo === 'medicamento') {
        med = identificacion.registro
      } else if (identificacion.tipo === 'lote') {
        const idMed = identificacion.registro.medicamento
        med =
          medicamentos.find((m) => m.id === idMed) ??
          (await getMedicamento(idMed))
      } else {
        // Búsqueda de respaldo en catálogo local por código de barras
        med =
          medicamentos.find(
            (m) =>
              m.codigo_barras &&
              m.codigo_barras.trim().toLowerCase() === limpio.toLowerCase(),
          ) ?? null
      }

      if (!med) {
        setError(`El código "${limpio}" no corresponde a ningún medicamento registrado.`)
        return
      }

      agregarMedicamento(med, 1, true)
    } catch (err) {
      console.error('Error al identificar código escaneado:', err)
      setError('No se pudo identificar el código escaneado.')
    } finally {
      setProcesandoEscaneo(false)
    }
  }

  const total = carrito.reduce(
    (suma, item) => suma + item.cantidad * Number(item.precio_unitario),
    0,
  )

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (guardando) return
    if (carrito.length === 0) {
      setError('Agrega al menos un medicamento a la venta.')
      return
    }

    const venta: NuevaVenta = {
      referencia,
      observacion: observacion.trim(),
      detalles: carrito.map(
        ({ stock_disponible: _stock, ...detalle }) => detalle,
      ),
    }

    setGuardando(true)
    setError('')
    setExito('')

    try {
      const registrada = await crearVenta(venta)
      setExito(`Venta ${registrada.referencia} registrada correctamente.`)
      setCarrito([])
      setObservacion('')
      setReferencia(nuevaReferencia())
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="bg-app-bg">
      <header className="border-b border-app-border bg-app-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/ventas')}
              aria-label="Volver al historial"
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg"
            >
              <ArrowLeft size={21} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-app-text">Farmacia Díaz</h1>
              <p className="text-sm text-app-muted">Registro de ventas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/ventas')}
            className="text-sm font-medium text-app-muted hover:text-app-text"
          >
            Historial
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <ShoppingCart className="text-emerald-700" size={27} />
          <div>
            <h2 className="text-2xl font-bold text-app-text">Nueva venta</h2>
            <p className="text-sm text-app-muted">Referencia: {referencia}</p>
          </div>
        </div>

        <form onSubmit={(evento) => void registrar(evento)}>
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <section className="rounded-xl border border-app-border bg-app-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-app-text">Productos</h3>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarEscaner((prev) => !prev)
                    setError('')
                    setExito('')
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    mostrarEscaner
                      ? 'border border-app-border bg-app-bg text-app-text hover:bg-app-border'
                      : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  <Barcode size={18} />
                  {mostrarEscaner ? 'Cerrar escáner' : 'Escanear código'}
                </button>
              </div>

              {mostrarEscaner && (
                <div className="mb-6 rounded-xl border border-app-border bg-app-bg p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-app-text">
                        Lector de códigos de barras y QR
                      </p>
                      <p className="text-xs text-app-muted">
                        Apunta la cámara al código de barras del medicamento
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setError('')
                        setExito('')
                        setLectorId((n) => n + 1)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-card px-2.5 py-1.5 text-xs font-medium text-app-text hover:bg-app-bg"
                    >
                      <RefreshCw size={14} />
                      Escanear otro código
                    </button>
                  </div>

                  <BarcodeScanner
                    key={lectorId}
                    onDetected={(valor) => void procesarCodigoEscaneado(valor)}
                  />

                  {procesandoEscaneo && (
                    <p className="mt-2 text-center text-xs font-semibold text-emerald-700">
                      Identificando medicamento y agregando 1 unidad...
                    </p>
                  )}

                  <form
                    onSubmit={(evento) => {
                      evento.preventDefault()
                      if (codigoManual.trim()) {
                        void procesarCodigoEscaneado(codigoManual)
                        setCodigoManual('')
                      }
                    }}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      type="text"
                      value={codigoManual}
                      onChange={(evento) => setCodigoManual(evento.target.value)}
                      placeholder="O escribe el código / escanea con lector USB"
                      className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={procesandoEscaneo || !codigoManual.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#003F63] px-3 py-2 text-xs font-semibold text-white hover:bg-[#002f4a] disabled:opacity-50"
                    >
                      <Search size={14} />
                      Buscar
                    </button>
                  </form>
                </div>
              )}

              {/* Mensajes de retroalimentación en la sección de productos */}
              {error && (
                <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {exito && (
                <div role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  {exito}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-[1fr_130px_auto]">
                <select
                  value={medicamentoId}
                  onChange={(evento) => setMedicamentoId(evento.target.value)}
                  disabled={cargando}
                  className="rounded-lg border border-app-border bg-app-card px-3 py-2.5"
                >
                  <option value="">Seleccionar medicamento manualmente</option>
                  {medicamentos.map((medicamento) => {
                    const stock = stockPorMedicamento(medicamento.id)
                    return (
                      <option
                        key={medicamento.id}
                        value={medicamento.id}
                        disabled={stock === 0}
                      >
                        {medicamento.nombre} · stock {stock}
                      </option>
                    )
                  })}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(evento) => setCantidad(evento.target.value)}
                  aria-label="Cantidad"
                  className="rounded-lg border border-app-border px-3 py-2.5"
                />
                <button
                  type="button"
                  onClick={agregarAlCarrito}
                  disabled={cargando}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Plus size={18} />
                  Agregar
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                {carrito.length === 0 ? (
                  <p className="py-8 text-center text-sm text-app-muted">
                    {cargando ? 'Cargando productos...' : 'Agrega productos para iniciar la venta.'}
                  </p>
                ) : (
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-app-border text-app-muted">
                      <tr>
                        <th className="py-3 pr-3">Medicamento</th>
                        <th className="py-3 pr-3">Cantidad</th>
                        <th className="py-3 pr-3">Precio</th>
                        <th className="py-3 pr-3">Subtotal</th>
                        <th className="py-3"><span className="sr-only">Quitar</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {carrito.map((item) => (
                        <tr key={item.medicamento_id}>
                          <td className="py-3 pr-3 font-medium text-app-text">{item.medicamento_nombre}</td>
                          <td className="py-3 pr-3">{item.cantidad}</td>
                          <td className="py-3 pr-3">Bs {item.precio_unitario}</td>
                          <td className="py-3 pr-3">Bs {(item.cantidad * Number(item.precio_unitario)).toFixed(2)}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              title="Quitar medicamento"
                              aria-label={`Quitar ${item.medicamento_nombre}`}
                              onClick={() =>
                                setCarrito((actual) =>
                                  actual.filter((linea) => linea.medicamento_id !== item.medicamento_id),
                                )
                              }
                              className="rounded p-2 text-app-muted hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="h-fit rounded-xl border border-app-border bg-app-card p-5">
              <h3 className="mb-4 font-semibold text-app-text">Resumen</h3>
              <label htmlFor="observacion" className="mb-2 block text-sm font-medium text-app-text">
                Observación
              </label>
              <textarea
                id="observacion"
                rows={3}
                value={observacion}
                onChange={(evento) => setObservacion(evento.target.value)}
                className="w-full rounded-lg border border-app-border px-3 py-2.5"
              />

              {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {exito && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{exito}</p>}

              <div className="mt-6 flex items-center justify-between border-t border-app-border pt-4">
                <span className="font-semibold text-app-text">Total</span>
                <span className="text-xl font-bold text-app-text">Bs {total.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                disabled={guardando || cargando || carrito.length === 0}
                className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? 'Procesando...' : 'Confirmar venta'}
              </button>
            </section>
          </div>
        </form>
      </section>
    </main>
  )
}

export default RegistrarVentaPage