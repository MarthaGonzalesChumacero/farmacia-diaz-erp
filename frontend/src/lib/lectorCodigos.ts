import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'

export const FORMATOS_SOPORTADOS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
]

// decode() restablece las pistas si recibe otras distintas, por eso se pasa siempre este mismo objeto.
const PISTAS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, FORMATOS_SOPORTADOS],
])
const lector = new MultiFormatReader()

// Las excepciones de zxing (NotFound, Checksum, Format) significan "este fotograma no tiene código".
function esExcepcionDeZxing(error: unknown) {
  return typeof (error as { getKind?: unknown })?.getKind === 'function'
}

export function decodificarLuminancia(
  luminancia: Uint8ClampedArray,
  ancho: number,
  alto: number,
): string | null {
  try {
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(luminancia, ancho, alto)),
    )
    return lector.decode(bitmap, PISTAS).getText()
  } catch (error) {
    if (esExcepcionDeZxing(error)) return null
    throw error
  }
}

export function rgbaALuminancia(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const luminancia = new Uint8ClampedArray(rgba.length / 4)
  for (let i = 0; i < luminancia.length; i += 1) {
    const p = i * 4
    luminancia[i] = (rgba[p] * 306 + rgba[p + 1] * 601 + rgba[p + 2] * 117) >> 10
  }
  return luminancia
}

// Recorte central (1/factor del fotograma) ampliado con interpolación bilineal.
export function ampliarCentro(
  luminancia: Uint8ClampedArray,
  ancho: number,
  alto: number,
  factor = 2,
): Uint8ClampedArray {
  const x0 = Math.floor((ancho - ancho / factor) / 2)
  const y0 = Math.floor((alto - alto / factor) / 2)
  const muestra = (x: number, y: number) =>
    luminancia[Math.min(alto - 1, y) * ancho + Math.min(ancho - 1, x)]
  const salida = new Uint8ClampedArray(ancho * alto)
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const sx = x0 + x / factor
      const sy = y0 + y / factor
      const ix = Math.floor(sx)
      const iy = Math.floor(sy)
      const fx = sx - ix
      const fy = sy - iy
      salida[y * ancho + x] =
        muestra(ix, iy) * (1 - fx) * (1 - fy) +
        muestra(ix + 1, iy) * fx * (1 - fy) +
        muestra(ix, iy + 1) * (1 - fx) * fy +
        muestra(ix + 1, iy + 1) * fx * fy
    }
  }
  return salida
}

// Un código pequeño o borroso (cámara de laptop de foco fijo) se lee mejor ampliado, así que se prueba también.
export function decodificarFotograma(
  luminancia: Uint8ClampedArray,
  ancho: number,
  alto: number,
): string | null {
  return (
    decodificarLuminancia(luminancia, ancho, alto) ??
    decodificarLuminancia(ampliarCentro(luminancia, ancho, alto), ancho, alto)
  )
}
