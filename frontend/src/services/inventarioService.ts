
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

// ======================================
// Alertas
// ======================================

export interface Alerta {
  id: number
  tipo: string
  mensaje: string
  leida: boolean
  medicamento: number
}

export async function getAlertas(): Promise<Alerta[]> {
  const response = await inventarioApi.get<Alerta[]>(
    '/alertas/',
  )

  return response.data
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
}

export interface NuevoLote {
  numero_lote: string
  fecha_vencimiento: string
  cantidad_inicial: number
  cantidad_actual: number
  precio_compra: string
  precio_venta: string
  activo: boolean
  medicamento: number
}

export async function getLotes(): Promise<Lote[]> {
  const response = await inventarioApi.get<Lote[]>('/lotes/')
  return response.data
}

export async function crearLote(lote: NuevoLote): Promise<Lote> {
  const response = await inventarioApi.post<Lote>('/lotes/', lote)
  return response.data
}

