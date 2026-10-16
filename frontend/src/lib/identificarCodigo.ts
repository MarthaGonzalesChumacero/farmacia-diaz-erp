import type { Lote, Medicamento } from '../services/inventarioService'

export type Identificacion =
  | { tipo: 'medicamento'; registro: Medicamento }
  | { tipo: 'lote'; registro: Lote }
  | { tipo: 'no_registrado' }

export interface ConsultasInventario {
  getMedicamento: (id: number) => Promise<Medicamento>
  getLote: (id: number) => Promise<Lote>
  getMedicamentoPorCodigo: (codigo: string) => Promise<Medicamento | null>
}

function esNoEncontrado(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status === 404
}

export async function identificarCodigo(
  valor: string,
  consultas: ConsultasInventario,
): Promise<Identificacion> {
  const limpio = valor.trim()
  const identificador = /^FDE:(MED|LOTE):(\d+)$/i.exec(limpio)

  try {
    if (identificador) {
      const id = Number(identificador[2])
      return identificador[1].toUpperCase() === 'MED'
        ? { tipo: 'medicamento', registro: await consultas.getMedicamento(id) }
        : { tipo: 'lote', registro: await consultas.getLote(id) }
    }

    // zxing devuelve un EAN-13 con cero inicial como UPC-A de 12 dígitos; se prueban ambas formas.
    const variantes = [limpio]
    if (/^\d{12}$/.test(limpio)) variantes.push(`0${limpio}`)
    if (/^0\d{12}$/.test(limpio)) variantes.push(limpio.slice(1))
    // Algunos códigos se registraron sin el dígito verificador del EAN-13.
    if (/^\d{13}$/.test(limpio)) variantes.push(limpio.slice(0, 12))

    for (const variante of variantes) {
      const medicamento = await consultas.getMedicamentoPorCodigo(variante)
      if (medicamento) return { tipo: 'medicamento', registro: medicamento }
    }
    return { tipo: 'no_registrado' }
  } catch (error) {
    if (esNoEncontrado(error)) return { tipo: 'no_registrado' }
    throw error
  }
}
