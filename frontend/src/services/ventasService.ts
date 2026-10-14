import ventasApi from '../api/ventasApi'

export interface DetalleVenta {
  id: number
  medicamento_id: number
  medicamento_nombre: string
  cantidad: number
  precio_unitario: string
  subtotal: string
}

export interface Venta {
  id: number
  referencia: string
  fecha_venta: string
  total: string
  estado: string
  observacion: string
  detalles: DetalleVenta[]
}

export interface NuevoDetalleVenta {
  medicamento_id: number
  medicamento_nombre: string
  cantidad: number
  precio_unitario: string
}

export interface NuevaVenta {
  referencia: string
  observacion: string
  detalles: NuevoDetalleVenta[]
}

export async function getVentas(): Promise<Venta[]> {
  const response = await ventasApi.get<Venta[]>(
    '/ventas/',
  )

  return response.data
}

export async function crearVenta(venta: NuevaVenta): Promise<Venta> {
  const response = await ventasApi.post<Venta>('/ventas/', venta)
  return response.data
}