
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
