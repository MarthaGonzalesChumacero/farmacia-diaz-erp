import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'

import {
  getAuditoria,
  getReporteKardex,
  getReporteStockCritico,
  getReporteVencimientos,
  type EventoAuditoria,
  type FiltroKardex,
  type LotePorVencer,
  type MovimientoInventario,
  type ReporteStockCritico,
} from '../services/inventarioService'
import {
  getAuditoriaUsuarios,
  getUsuarioActual,
} from '../services/authService'

type VistaReporte = 'stock' | 'vencimientos' | 'kardex' | 'auditoria'
type CeldaCSV = string | number | null | undefined
type FilaCSV = Record<string, CeldaCSV>

function descargarCSV(nombre: string, filas: FilaCSV[]) {
  if (filas.length === 0) return
  const columnas = Object.keys(filas[0])
  const escapar = (valor: CeldaCSV) => {
    let texto = valor === null || valor === undefined ? '' : String(valor)
    if (/^[\s=+@-]/.test(texto)) texto = `'${texto}`
    return `"${texto.replaceAll('"', '""')}"`
  }
  const contenido = [
    columnas.map(escapar).join(','),
    ...filas.map((fila) => columnas.map((columna) => escapar(fila[columna])).join(',')),
  ].join('\r\n')
  const archivo = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

function ReportesPage() {
  const navigate = useNavigate()
  const [vista, setVista] = useState<VistaReporte>('stock')
  const [stock, setStock] = useState<ReporteStockCritico[]>([])
  const [vencimientos, setVencimientos] = useState<LotePorVencer[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [auditoria, setAuditoria] = useState<EventoAuditoria[]>([])
  const [esAdministrador, setEsAdministrador] = useState(false)
  const [dias, setDias] = useState('30')
  const [filtrosKardex, setFiltrosKardex] = useState<FiltroKardex>({})
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let montado = true
    Promise.all([
      getUsuarioActual(),
      getReporteStockCritico(),
      getReporteVencimientos(),
      getReporteKardex(),
    ])
      .then(async ([usuario, stockResult, vencimientosResult, kardexResult]) => {
        if (!montado) return
        const administrador = usuario.rol === 'administrador'
        setStock(stockResult.resultados)
        setVencimientos(vencimientosResult.resultados)
        setMovimientos(kardexResult.resultados)
        setEsAdministrador(administrador)
        if (administrador) {
          const [auditoriaInventario, auditoriaUsuarios] = await Promise.all([
            getAuditoria(),
            getAuditoriaUsuarios(),
          ])
          setAuditoria([
            ...auditoriaInventario,
            ...auditoriaUsuarios.map((evento) => ({
              id: -evento.id,
              accion: evento.accion,
              entidad: 'usuario',
              entidad_id: evento.usuario_id,
              actor_id: evento.actor_id,
              actor_username: evento.actor_username,
              referencia: evento.usuario_username,
              detalles: evento.cambios,
              direccion_ip: null,
              user_agent: '',
              fecha_evento: evento.fecha_evento,
            })),
          ].sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento)))
        }
      })
      .catch(() => {
        if (montado) setError('No se pudieron cargar los reportes de inventario.')
      })
      .finally(() => {
        if (montado) setCargando(false)
      })
    return () => { montado = false }
  }, [])

  async function actualizarTodo() {
    setActualizando(true)
    setError('')
    try {
      const [stockResult, vencimientosResult, kardexResult, auditoriaResult] =
        await Promise.all([
          getReporteStockCritico(),
          getReporteVencimientos(Number(dias)),
          getReporteKardex(filtrosKardex),
          esAdministrador
            ? Promise.all([getAuditoria(), getAuditoriaUsuarios()])
            : Promise.resolve([[], []]),
        ])
      setStock(stockResult.resultados)
      setVencimientos(vencimientosResult.resultados)
      setMovimientos(kardexResult.resultados)
      const [auditoriaInventario, auditoriaUsuarios] = auditoriaResult
      setAuditoria([
        ...auditoriaInventario,
        ...auditoriaUsuarios.map((evento) => ({
          id: -evento.id,
          accion: evento.accion,
          entidad: 'usuario',
          entidad_id: evento.usuario_id,
          actor_id: evento.actor_id,
          actor_username: evento.actor_username,
          referencia: evento.usuario_username,
          detalles: evento.cambios,
          direccion_ip: null,
          user_agent: '',
          fecha_evento: evento.fecha_evento,
        })),
      ].sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento)))
    } catch {
      setError('No se pudieron actualizar los reportes.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  async function aplicarFiltrosKardex(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setActualizando(true)
    setError('')
    try {
      const resultado = await getReporteKardex(filtrosKardex)
      setMovimientos(resultado.resultados)
      setVista('kardex')
    } catch {
      setError('No se pudieron aplicar los filtros del kardex.')
    } finally {
      setActualizando(false)
    }
  }

  const datosCSV: FilaCSV[] = vista === 'stock'
    ? stock.map((fila) => ({ medicamento: fila.medicamento, stock_actual: fila.stock_actual, stock_minimo: fila.stock_minimo }))
    : vista === 'vencimientos'
      ? vencimientos.map((fila) => ({ medicamento: fila.medicamento, numero_lote: fila.numero_lote, fecha_vencimiento: fila.fecha_vencimiento, dias_restantes: fila.dias_restantes, stock_actual: fila.stock_actual }))
      : vista === 'kardex'
        ? movimientos.map((fila) => ({ fecha: fila.fecha_movimiento, medicamento: fila.medicamento, lote: fila.numero_lote, tipo: fila.tipo_descripcion, cantidad: fila.cantidad, saldo: fila.stock_resultante, motivo: fila.motivo, referencia: fila.referencia }))
        : auditoria.map((fila) => ({ fecha: fila.fecha_evento, actor: fila.actor_username, accion: fila.accion, entidad: fila.entidad, entidad_id: fila.entidad_id, referencia: fila.referencia, ip: fila.direccion_ip, detalles: JSON.stringify(fila.detalles) }))

  const titulos: Record<VistaReporte, string> = {
    stock: 'Stock crítico',
    vencimientos: 'Próximos a vencer',
    kardex: 'Kardex de movimientos',
    auditoria: 'Auditoría de operaciones',
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/dashboard')} aria-label="Volver al panel" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} /></button>
            <div><h1 className="text-xl font-bold text-slate-900">Reportes</h1><p className="text-sm text-slate-500">Inventario y trazabilidad</p></div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void actualizarTodo()} disabled={actualizando} title="Actualizar reportes" aria-label="Actualizar reportes" className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={18} /></button>
            <button type="button" onClick={() => descargarCSV(`farmacia-diaz-${vista}.csv`, datosCSV)} disabled={datosCSV.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"><Download size={17} />CSV</button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
          {(['stock', 'vencimientos', 'kardex', ...(esAdministrador ? ['auditoria' as const] : [])] as const).map((opcion) => (
            <button key={opcion} type="button" aria-pressed={vista === opcion} onClick={() => setVista(opcion)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${vista === opcion ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {titulos[opcion]}
            </button>
          ))}
        </div>

        {vista === 'vencimientos' && <label className="mb-4 inline-flex items-center gap-3 text-sm font-medium text-slate-700">Ventana de vencimiento<input type="number" min="0" max="3650" value={dias} onChange={(evento) => setDias(evento.target.value)} className="w-24 rounded-lg border border-slate-300 px-3 py-2" />días</label>}
        {vista === 'kardex' && (
          <form onSubmit={(evento) => void aplicarFiltrosKardex(evento)} className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-slate-700">Tipo<select value={filtrosKardex.tipo ?? ''} onChange={(evento) => setFiltrosKardex((actual) => ({ ...actual, tipo: (evento.target.value || undefined) as FiltroKardex['tipo'] }))} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Todos</option><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste_entrada">Ajuste entrada</option><option value="ajuste_salida">Ajuste salida</option><option value="vencimiento">Vencimiento</option><option value="devolucion">Devolución</option></select></label>
            <label className="text-sm font-medium text-slate-700">Desde<input type="date" value={filtrosKardex.desde ?? ''} onChange={(evento) => setFiltrosKardex((actual) => ({ ...actual, desde: evento.target.value || undefined }))} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Hasta<input type="date" value={filtrosKardex.hasta ?? ''} onChange={(evento) => setFiltrosKardex((actual) => ({ ...actual, hasta: evento.target.value || undefined }))} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" /></label>
            <button type="submit" disabled={actualizando} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Aplicar</button>
          </form>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">{titulos[vista]}</h2><p className="mt-1 text-xs text-slate-500">{datosCSV.length} registros</p></div>
          {cargando ? <p className="p-8 text-center text-slate-500">Cargando reportes...</p> : datosCSV.length === 0 ? <p className="p-8 text-center text-slate-500">No hay resultados para esta vista.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr>{Object.keys(datosCSV[0]).map((columna) => <th key={columna} className="px-4 py-3 font-semibold capitalize">{columna.replaceAll('_', ' ')}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{datosCSV.map((fila, indice) => <tr key={indice}>{Object.values(fila).map((valor, columna) => <td key={columna} className="max-w-[360px] whitespace-normal px-4 py-3 text-slate-700">{String(valor ?? '—')}</td>)}</tr>)}</tbody>
            </table></div>
          )}
        </section>
      </section>
    </main>
  )
}

export default ReportesPage