
import inventarioApi from '../api/inventarioApi'

// ======================================
// Medicamentos
// ======================================

export interface Medicamento {
  id: number
  nombre: string
  principio_activo: string
  presentacion: string
  codigo_barras: string
  registro_sanitario: string
  descripcion: string
  stock_minimo: number
  unidad_medida: string
  activo: boolean
  fecha_registro: string
  categoria: number
  laboratorio: number
}

export async function getMedicamentos(): Promise<Medicamento[]> {
  const response = await inventarioApi.get<Medicamento[]>(
    '/medicamentos/',
  )

  return response.data
}

export async function getMedicamento(id: number): Promise<Medicamento> {
  const response = await inventarioApi.get<Medicamento>(
    `/medicamentos/${id}/`,
  )
  return response.data
}

export async function getMedicamentoPorCodigo(
  codigo: string,
): Promise<Medicamento | null> {
  const response = await inventarioApi.get<Medicamento[]>(
    '/medicamentos/',
    { params: { codigo_barras: codigo } },
  )
  return response.data[0] ?? null
}

// ======================================
// Alertas
// ======================================

export interface Alerta {
  id: number
  tipo: string
  mensaje: string
  leida: boolean
  medicamento: number
  medicamento_nombre?: string
  fecha_creacion: string
}

export async function getAlertas(): Promise<Alerta[]> {
  const response = await inventarioApi.get<Alerta[]>(
    '/alertas/',
  )

  return response.data
}

export async function actualizarEstadoAlerta(
  id: number,
  leida: boolean,
): Promise<void> {
  await inventarioApi.patch(`/alertas/${id}/estado/`, { leida })
}

export async function verificarAlertasVencimiento(): Promise<void> {
  await inventarioApi.post('/alertas/verificar-vencimientos/')
}


export interface NuevoMedicamento {
  nombre: string
  principio_activo: string
  presentacion: string
  codigo_barras: string
  registro_sanitario?: string
  descripcion?: string
  stock_minimo?: number
  unidad_medida?: string
  categoria?: number | null
  laboratorio?: number | null
}

export async function crearMedicamento(
  medicamento: NuevoMedicamento,
): Promise<Medicamento> {
  const response = await inventarioApi.post<Medicamento>(
    '/medicamentos/',
    medicamento,
  )

  return response.data
}

export async function actualizarMedicamento(
  id: number,
  cambios: Partial<NuevoMedicamento> & { activo?: boolean },
): Promise<Medicamento> {
  const response = await inventarioApi.patch<Medicamento>(
    `/medicamentos/${id}/`,
    cambios,
  )
  return response.data
}

 // ======================================
 // Lotes
 // ======================================

export interface Lote {
  id: number
  numero_lote: string
  fecha_vencimiento: string
  cantidad_inicial: number
  cantidad_actual: number
  precio_compra: string
  precio_venta: string
  activo: boolean
  medicamento: number
  medicamento_nombre?: string
  proveedor: number | null
  proveedor_nombre?: string | null
}

export interface NuevoLote {
  numero_lote: string
  fecha_vencimiento: string
  cantidad_inicial: number
  precio_compra: string
  precio_venta: string
  activo: boolean
  medicamento: number
  proveedor?: number | null
}

export async function getLotes(): Promise<Lote[]> {
  const response = await inventarioApi.get<Lote[]>('/lotes/')
  return response.data
}

export async function getLote(id: number): Promise<Lote> {
  const response = await inventarioApi.get<Lote>(`/lotes/${id}/`)
  return response.data
}

export async function crearLote(lote: NuevoLote): Promise<Lote> {
  const response = await inventarioApi.post<Lote>('/lotes/', lote)
  return response.data
}

export type CambiosLote = Partial<
  Pick<Lote, 'fecha_vencimiento' | 'precio_compra' | 'precio_venta' | 'activo' | 'proveedor'>
>

export async function actualizarLote(
  id: number,
  cambios: CambiosLote,
): Promise<Lote> {
  const response = await inventarioApi.patch<Lote>(
    `/lotes/${id}/`,
    cambios,
  )
  return response.data
}

export interface Proveedor {
  id: number
  nombre: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  activo: boolean
  fecha_registro: string
}

export type NuevoProveedor = Omit<Proveedor, 'id' | 'fecha_registro'>

export async function getProveedores(): Promise<Proveedor[]> {
  const response = await inventarioApi.get<Proveedor[]>('/proveedores/')
  return response.data
}

export async function crearProveedor(
  proveedor: NuevoProveedor,
): Promise<Proveedor> {
  const response = await inventarioApi.post<Proveedor>(
    '/proveedores/',
    proveedor,
  )
  return response.data
}

export async function actualizarProveedor(
  id: number,
  cambios: Partial<NuevoProveedor>,
): Promise<Proveedor> {
  const response = await inventarioApi.patch<Proveedor>(
    `/proveedores/${id}/`,
    cambios,
  )
  return response.data
}

export type TipoMovimiento =
  | 'entrada'
  | 'salida'
  | 'ajuste_entrada'
  | 'ajuste_salida'
  | 'vencimiento'

export interface MovimientoInventario {
  id: number
  lote: number
  medicamento: string
  numero_lote: string
  tipo: TipoMovimiento
  tipo_descripcion: string
  cantidad: number
  motivo: string
  referencia: string
  stock_resultante: number
  fecha_movimiento: string
}

export interface NuevoMovimiento {
  lote: number
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
  referencia: string
}

export async function getMovimientos(): Promise<MovimientoInventario[]> {
  const response = await inventarioApi.get<MovimientoInventario[]>(
    '/movimientos/',
  )
  return response.data
}

export async function crearMovimiento(
  movimiento: NuevoMovimiento,
): Promise<MovimientoInventario> {
  const response = await inventarioApi.post<MovimientoInventario>(
    '/movimientos/',
    movimiento,
  )
  return response.data
}

export interface LotePorVencer {
  medicamento_id: number
  medicamento: string
  numero_lote: string
  fecha_vencimiento: string
  dias_restantes: number
  stock_actual: number
}

export async function getLotesPorVencer(): Promise<LotePorVencer[]> {
  const response = await inventarioApi.get<{
    resultados: LotePorVencer[]
  }>('/alertas/reporte-vencimientos/')
  return response.data.resultados
}

export interface ReporteStockCritico {
  medicamento_id: number
  medicamento: string
  stock_actual: number
  stock_minimo: number
}

export interface ReporteResultado<T> {
  total_registros: number
  resultados: T[]
}

export interface EventoAuditoria {
  id: number
  accion: string
  entidad: string
  entidad_id: number | null
  actor_id: number | null
  actor_username: string
  referencia: string
  detalles: Record<string, unknown>
  direccion_ip: string | null
  user_agent: string
  fecha_evento: string
}

export interface FiltroKardex {
  tipo?: TipoMovimiento
  medicamento?: number
  desde?: string
  hasta?: string
}

export async function getReporteStockCritico(): Promise<ReporteResultado<ReporteStockCritico>> {
  const response = await inventarioApi.get<ReporteResultado<ReporteStockCritico>>(
    '/alertas/reporte-stock-critico/',
  )
  return response.data
}

export async function getReporteVencimientos(
  dias = 30,
): Promise<ReporteResultado<LotePorVencer>> {
  const response = await inventarioApi.get<ReporteResultado<LotePorVencer>>(
    '/alertas/reporte-vencimientos/',
    { params: { dias } },
  )
  return response.data
}

export async function getReporteKardex(
  filtros: FiltroKardex = {},
): Promise<ReporteResultado<MovimientoInventario>> {
  const response = await inventarioApi.get<ReporteResultado<MovimientoInventario>>(
    '/movimientos/reporte-kardex/',
    { params: filtros },
  )
  return response.data
}

export async function getAuditoria(): Promise<EventoAuditoria[]> {
  const response = await inventarioApi.get<EventoAuditoria[]>('/auditoria/')
  return response.data
}

