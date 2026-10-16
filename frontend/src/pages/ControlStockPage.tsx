import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  PackagePlus,
  RefreshCw,
  Wrench,
} from 'lucide-react'

import {
  crearMovimiento,
  getLotes,
  getLotesPorVencer,
  getMedicamentos,
  getMovimientos,
  type Lote,
  type LotePorVencer,
  type Medicamento,
  type MovimientoInventario,
  type TipoMovimiento,
} from '../services/inventarioService'
import { getUsuarioActual } from '../services/authService'

interface FormularioMovimiento {
  medicamento: string
  lote: string
  tipo: TipoMovimiento
  cantidad: string
  motivo: string
  referencia: string
}

const formularioVacio: FormularioMovimiento = {
  medicamento: '',
  lote: '',
  tipo: 'entrada',
  cantidad: '1',
  motivo: '',
  referencia: '',
}

function fechaLocal(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

function obtenerMensaje(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const datos = error.response?.data as
      | { detalle?: unknown; detail?: unknown }
      | undefined
    const detalle = datos?.detalle ?? datos?.detail
    if (typeof detalle === 'string') return detalle
    if (Array.isArray(detalle)) return detalle.join(', ')
  }
  return 'No se pudo completar la operación. Revisa la conexión e inténtalo de nuevo.'
}

function ControlStockPage() {
  const navigate = useNavigate()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [vencimientos, setVencimientos] = useState<LotePorVencer[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [formulario, setFormulario] = useState<FormularioMovimiento>(formularioVacio)
  const [medicamentoMovimiento, setMedicamentoMovimiento] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [esAdministrador, setEsAdministrador] = useState(false)

  useEffect(() => {
    let montado = true
    Promise.all([
      getMedicamentos(),
      getLotes(),
      getLotesPorVencer(),
      getMovimientos(),
      getUsuarioActual(),
    ])
      .then(([listaMedicamentos, listaLotes, listaVencimientos, listaMovimientos, usuario]) => {
        if (!montado) return
        setMedicamentos(listaMedicamentos)
        setLotes(listaLotes)
        setVencimientos(listaVencimientos)
        setMovimientos(listaMovimientos)
        setEsAdministrador(usuario.rol === 'administrador')
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

  const hoy = fechaLocal()
  const stockDisponible = (medicamentoId: number) =>
    lotes
      .filter(
        (lote) =>
          lote.medicamento === medicamentoId &&
          lote.activo &&
          lote.fecha_vencimiento >= hoy,
      )
      .reduce((total, lote) => total + lote.cantidad_actual, 0)

  const activos = medicamentos.filter((medicamento) => medicamento.activo)
  const agotados = activos.filter(
    (medicamento) => stockDisponible(medicamento.id) === 0,
  )
  const criticos = activos.filter((medicamento) => {
    const stock = stockDisponible(medicamento.id)
    return stock > 0 && stock <= medicamento.stock_minimo
  })

  const lotesParaMovimiento = lotes.filter((lote) => {
    if (
      !lote.activo ||
      lote.medicamento !== Number(formulario.medicamento)
    ) {
      return false
    }
    if (formulario.tipo === 'vencimiento') {
      return lote.cantidad_actual > 0 && lote.fecha_vencimiento < hoy
    }
    if (formulario.tipo === 'salida' || formulario.tipo === 'ajuste_salida') {
      return lote.cantidad_actual > 0 && lote.fecha_vencimiento >= hoy
    }
    return lote.fecha_vencimiento >= hoy
  })

  async function actualizarDatos() {
    setActualizando(true)
    setError('')
    try {
      const [listaMedicamentos, listaLotes, listaVencimientos, listaMovimientos] =
        await Promise.all([
          getMedicamentos(),
          getLotes(),
          getLotesPorVencer(),
          getMovimientos(),
        ])
      setMedicamentos(listaMedicamentos)
      setLotes(listaLotes)
      setVencimientos(listaVencimientos)
      setMovimientos(listaMovimientos)
    } catch (err) {
      setError(obtenerMensaje(err))
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  function abrirMovimiento(medicamento: Medicamento) {
    const tipo: TipoMovimiento = 'entrada'
    const primerLote = lotes.find(
      (lote) =>
        lote.medicamento === medicamento.id &&
        lote.activo &&
        lote.fecha_vencimiento >= hoy,
    )
    setFormulario({
      ...formularioVacio,
      medicamento: String(medicamento.id),
      lote: primerLote ? String(primerLote.id) : '',
      tipo,
      referencia: '',
    })
    setMedicamentoMovimiento(medicamento.id)
    setError('')
    setMensaje('')
  }

  async function guardarMovimiento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const cantidad = Number(formulario.cantidad)
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setError('La cantidad debe ser un entero mayor que cero.')
      return
    }
    if (!formulario.lote) {
      setError('Selecciona un lote disponible para este movimiento.')
      return
    }
    if (!formulario.motivo.trim()) {
      setError('Describe el motivo para dejar trazabilidad.')
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await crearMovimiento({
        lote: Number(formulario.lote),
        tipo: formulario.tipo,
        cantidad,
        motivo: formulario.motivo.trim(),
        referencia: formulario.referencia.trim(),
      })
      setMensaje('Movimiento registrado y stock actualizado.')
      setMedicamentoMovimiento(null)
      await actualizarDatos()
    } catch (err) {
      setError(obtenerMensaje(err))
    } finally {
      setGuardando(false)
    }
  }

  const medicamentoSeleccionado = medicamentos.find(
    (item) => item.id === medicamentoMovimiento,
  )

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
              <h1 className="text-xl font-bold text-app-text">Control de stock</h1>
              <p className="text-sm text-app-muted">Existencias y movimientos auditables</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void actualizarDatos()}
              disabled={actualizando}
              title="Actualizar existencias"
              aria-label="Actualizar existencias"
              className="rounded-lg border border-app-border bg-app-card p-2.5 text-app-text hover:bg-app-bg disabled:opacity-50"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-app-text">Existencias</h2>
          <p className="mt-1 text-sm text-app-muted">
            El stock disponible excluye lotes vencidos. Todo cambio queda en el kardex.
          </p>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}

        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-app-border bg-app-card p-5">
            <p className="text-sm text-app-muted">Medicamentos activos</p>
            <p className="mt-2 text-3xl font-bold text-app-text">{cargando ? '...' : activos.length}</p>
          </article>
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm text-amber-800">Stock crítico</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{cargando ? '...' : criticos.length}</p>
          </article>
          <article className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm text-red-800">Agotados</p>
            <p className="mt-2 text-3xl font-bold text-red-900">{cargando ? '...' : agotados.length}</p>
          </article>
          <article className="rounded-xl border border-sky-200 bg-sky-50 p-5">
            <Clock3 className="mb-2 text-sky-700" size={20} />
            <p className="text-sm text-sky-800">Lotes por vencer · 30 días</p>
            <p className="mt-2 text-3xl font-bold text-sky-900">{cargando ? '...' : vencimientos.length}</p>
          </article>
        </div>

        <section className="mb-8 overflow-hidden rounded-xl border border-app-border bg-app-card">
          <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
            <h3 className="font-semibold text-app-text">Existencias por medicamento</h3>
            {esAdministrador && <button
              type="button"
              onClick={() => navigate('/inventario/lotes/registrar')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#003F63] px-3 py-2 text-sm font-medium text-white hover:bg-[#00507d]"
            >
              <PackagePlus size={17} />
              Nuevo lote
            </button>}
          </div>
          {cargando ? (
            <p className="p-8 text-center text-app-muted">Cargando existencias...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-app-bg text-app-muted">
                  <tr>
                    <th className="px-5 py-3">Medicamento</th>
                    <th className="px-5 py-3">Stock utilizable</th>
                    <th className="px-5 py-3">Mínimo</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {activos.map((medicamento) => {
                    const stock = stockDisponible(medicamento.id)
                    const estado = stock === 0
                      ? 'Agotado'
                      : stock <= medicamento.stock_minimo
                        ? 'Crítico'
                        : 'Normal'
                    return (
                      <tr key={medicamento.id}>
                        <td className="px-5 py-3 font-medium text-app-text">{medicamento.nombre}</td>
                        <td className="px-5 py-3 tabular-nums">{stock}</td>
                        <td className="px-5 py-3 tabular-nums">{medicamento.stock_minimo}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            estado === 'Agotado'
                              ? 'bg-red-100 text-red-800'
                              : estado === 'Crítico'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}>{estado}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {esAdministrador && <button
                            type="button"
                            onClick={() => abrirMovimiento(medicamento)}
                            className="rounded-lg border border-app-border px-3 py-2 text-sm font-medium text-app-text hover:bg-app-bg"
                          >
                            Registrar movimiento
                          </button>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-5 py-4">
              <h3 className="font-semibold text-app-text">Próximos a vencer</h3>
              <p className="mt-1 text-xs text-app-muted">Lotes con existencia y vencimiento dentro de 30 días.</p>
            </div>
            {vencimientos.length === 0 ? (
              <p className="p-6 text-sm text-app-muted">No hay lotes próximos a vencer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-app-bg text-app-muted">
                    <tr><th className="px-5 py-3">Medicamento / lote</th><th className="px-5 py-3">Vence</th><th className="px-5 py-3">Días</th><th className="px-5 py-3">Stock</th></tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {vencimientos.map((lote) => (
                      <tr key={`${lote.medicamento_id}-${lote.numero_lote}`}>
                        <td className="px-5 py-3"><p className="font-medium text-app-text">{lote.medicamento}</p><p className="text-xs text-app-muted">{lote.numero_lote}</p></td>
                        <td className="px-5 py-3">{lote.fecha_vencimiento}</td>
                        <td className="px-5 py-3">{lote.dias_restantes}</td>
                        <td className="px-5 py-3">{lote.stock_actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-app-border bg-app-card">
            <div className="border-b border-app-border px-5 py-4">
              <h3 className="font-semibold text-app-text">Kardex reciente</h3>
            </div>
            {movimientos.length === 0 ? (
              <p className="p-6 text-sm text-app-muted">Todavía no hay movimientos registrados.</p>
            ) : (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="sticky top-0 bg-app-bg text-app-muted">
                    <tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Movimiento</th><th className="px-5 py-3">Cantidad</th><th className="px-5 py-3">Saldo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {movimientos.slice(0, 50).map((movimiento) => (
                      <tr key={movimiento.id}>
                        <td className="px-5 py-3 text-xs text-app-muted">{new Date(movimiento.fecha_movimiento).toLocaleString('es-BO')}</td>
                        <td className="px-5 py-3"><p className="font-medium text-app-text">{movimiento.medicamento}</p><p className="text-xs text-app-muted">{movimiento.tipo_descripcion} · {movimiento.numero_lote}</p><p className="text-xs text-app-muted">{movimiento.motivo}</p></td>
                        <td className="px-5 py-3">{movimiento.cantidad}</td>
                        <td className="px-5 py-3">{movimiento.stock_resultante}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>

      {medicamentoSeleccionado && esAdministrador && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="movimiento-titulo"
            className="w-full max-w-xl rounded-xl bg-app-card p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="movimiento-titulo" className="text-xl font-bold text-app-text">Registrar movimiento</h2>
                <p className="mt-1 text-sm text-app-muted">{medicamentoSeleccionado.nombre}</p>
              </div>
              <button type="button" onClick={() => setMedicamentoMovimiento(null)} aria-label="Cerrar" className="rounded-lg px-3 py-2 text-app-muted hover:bg-app-bg">Cerrar</button>
            </div>

            <form onSubmit={(evento) => void guardarMovimiento(evento)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-app-text">
                  Tipo de movimiento
                  <select
                    value={formulario.tipo}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, tipo: evento.target.value as TipoMovimiento, lote: '' }))}
                    className="mt-1.5 w-full rounded-lg border border-app-border bg-app-card px-3 py-2.5"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste_entrada">Ajuste de entrada</option>
                    <option value="ajuste_salida">Ajuste de salida</option>
                    <option value="vencimiento">Baja por vencimiento</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-app-text">
                  Lote
                  <select
                    required
                    value={formulario.lote}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, lote: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-app-border bg-app-card px-3 py-2.5"
                  >
                    <option value="">Seleccionar lote</option>
                    {lotesParaMovimiento.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.numero_lote} · vence {lote.fecha_vencimiento} · stock {lote.cantidad_actual}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-app-text">
                  Cantidad
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formulario.cantidad}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, cantidad: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium text-app-text">
                  Referencia
                  <input
                    value={formulario.referencia}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, referencia: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-app-text">
                Motivo
                <textarea
                  required
                  minLength={3}
                  rows={3}
                  value={formulario.motivo}
                  onChange={(evento) => setFormulario((actual) => ({ ...actual, motivo: evento.target.value }))}
                  placeholder="Describe la razón de la entrada, salida o ajuste"
                  className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5"
                />
              </label>
              {lotesParaMovimiento.length === 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  No hay lotes elegibles para este tipo de movimiento. Registra un lote vigente para ingresar stock o elige un lote vencido para darlo de baja.
                </p>
              )}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-app-border pt-4">
                <button type="button" onClick={() => setMedicamentoMovimiento(null)} className="rounded-lg border border-app-border px-4 py-2.5 font-medium text-app-text hover:bg-app-bg">Cancelar</button>
                <button type="submit" disabled={guardando || lotesParaMovimiento.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-[#003F63] px-4 py-2.5 font-semibold text-white hover:bg-[#00507d] disabled:opacity-50">
                  {formulario.tipo === 'entrada' || formulario.tipo === 'ajuste_entrada'
                    ? <ArrowDownToLine size={17} />
                    : formulario.tipo === 'salida' || formulario.tipo === 'vencimiento'
                      ? <ArrowUpFromLine size={17} />
                      : <Wrench size={17} />}
                  {guardando ? 'Guardando...' : 'Guardar movimiento'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default ControlStockPage