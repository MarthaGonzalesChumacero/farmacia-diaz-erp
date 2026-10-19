import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  InvertedLuminanceSource,
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

// Pistas rápidas (sin TRY_HARDER): escanea 25 filas en ~1-2ms, ideal para tiempo real fluido
export const PISTAS_RAPIDAS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, FORMATOS_SOPORTADOS],
])

// Pistas profundas (con TRY_HARDER): analiza cada fila individualmente, para códigos muy lejanos o degradados
export const PISTAS_PROFUNDAS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, FORMATOS_SOPORTADOS],
])

// Mantener compatibilidad con PISTAS
export const PISTAS = PISTAS_PROFUNDAS

const lector = new MultiFormatReader()

// Validación de checksum Modulo-10 para EAN-13
export function esEAN13Valido(codigo: string): boolean {
  if (!/^\d{13}$/.test(codigo)) return false
  const d = codigo.split('').map(Number)
  const suma = d.slice(0, 12).reduce((acc, val, idx) => acc + val * (idx % 2 === 0 ? 1 : 3), 0)
  const verificador = (10 - (suma % 10)) % 10
  return d[12] === verificador
}

// Validación de checksum Modulo-10 para UPC-A
export function esUPCAValido(codigo: string): boolean {
  if (!/^\d{12}$/.test(codigo)) return false
  const d = codigo.split('').map(Number)
  const suma = d.slice(0, 11).reduce((acc, val, idx) => acc + val * (idx % 2 === 0 ? 3 : 1), 0)
  const verificador = (10 - (suma % 10)) % 10
  return d[11] === verificador
}

// Validación de checksum Modulo-10 para EAN-8
export function esEAN8Valido(codigo: string): boolean {
  if (!/^\d{8}$/.test(codigo)) return false
  const d = codigo.split('').map(Number)
  const suma = d.slice(0, 7).reduce((acc, val, idx) => acc + val * (idx % 2 === 0 ? 3 : 1), 0)
  const verificador = (10 - (suma % 10)) % 10
  return d[7] === verificador
}

// Filtro de integridad para evitar lecturas falsas, corruptas o truncadas
export function esCodigoValido(valor: string): boolean {
  const limpio = valor.trim()
  if (/^FDE:(MED|LOTE):\d+$/i.test(limpio)) return true
  if (/^\d{13}$/.test(limpio)) return esEAN13Valido(limpio)
  if (/^\d{12}$/.test(limpio)) return esUPCAValido(limpio)
  if (/^\d{8}$/.test(limpio)) return esEAN8Valido(limpio)
  // Otros códigos alfanuméricos (ej. Code 128) requieren al menos 3 caracteres
  return limpio.length >= 3
}

// Las excepciones de zxing (NotFound, Checksum, Format) significan "este fotograma no tiene código".
function esExcepcionDeZxing(error: unknown): boolean {
  if (!error) return false
  const err = error as { getKind?: unknown; name?: string; message?: string }
  return (
    typeof err.getKind === 'function' ||
    err.name === 'NotFoundException' ||
    err.name === 'ChecksumException' ||
    err.name === 'FormatException' ||
    (typeof err.message === 'string' &&
      (err.message.includes('NotFoundException') ||
        err.message.includes('No MultiFormat Readers') ||
        err.message.includes('No pattern found')))
  )
}

export function decodificarLuminancia(
  luminancia: Uint8ClampedArray,
  ancho: number,
  alto: number,
  pistas = PISTAS_RAPIDAS,
): string | null {
  try {
    const source = new RGBLuminanceSource(luminancia, ancho, alto)

    // 1. Probar con HybridBinarizer (umbral adaptativo por bloques locales)
    try {
      const bitmap = new BinaryBitmap(new HybridBinarizer(source))
      const res = lector.decode(bitmap, pistas).getText()
      if (esCodigoValido(res)) return res
    } catch (error) {
      if (!esExcepcionDeZxing(error)) throw error
    }

    // 2. Probar con GlobalHistogramBinarizer (umbral global, más tolerante a iluminación de pantalla y papel)
    try {
      const bitmapGlobal = new BinaryBitmap(new GlobalHistogramBinarizer(source))
      const res = lector.decode(bitmapGlobal, pistas).getText()
      if (esCodigoValido(res)) return res
    } catch (error) {
      if (!esExcepcionDeZxing(error)) throw error
    }

    // 3. Probar con Luminancia invertida solo en barrido profundo
    if (pistas === PISTAS_PROFUNDAS) {
      try {
        const bitmapInvertido = new BinaryBitmap(
          new HybridBinarizer(new InvertedLuminanceSource(source)),
        )
        const res = lector.decode(bitmapInvertido, pistas).getText()
        if (esCodigoValido(res)) return res
      } catch (error) {
        if (!esExcepcionDeZxing(error)) throw error
      }
    }

    return null
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

// Rotación rápida 90 grados para leer códigos de barras orientados verticalmente
export function rotar90(
  luminancia: Uint8ClampedArray,
  ancho: number,
  alto: number,
): { luminancia: Uint8ClampedArray; ancho: number; alto: number } {
  const rotada = new Uint8ClampedArray(ancho * alto)
  for (let y = 0; y < alto; y++) {
    const rowOffset = y * ancho
    for (let x = 0; x < ancho; x++) {
      rotada[x * alto + (alto - 1 - y)] = luminancia[rowOffset + x]
    }
  }
  return { luminancia: rotada, ancho: alto, alto: ancho }
}

// Normalización de contraste para compensar cámaras web con rango dinámico bajo
export function mejorarContraste(luminancia: Uint8ClampedArray): Uint8ClampedArray {
  let min = 255
  let max = 0
  const total = luminancia.length
  for (let i = 0; i < total; i += 8) {
    const v = luminancia[i]
    if (v < min) min = v
    if (v > max) max = v
  }
  const rango = max - min
  if (rango < 25 || rango > 180) {
    return luminancia
  }
  const salida = new Uint8ClampedArray(total)
  const factor = 255 / rango
  for (let i = 0; i < total; i += 1) {
    const v = Math.round((luminancia[i] - min) * factor)
    salida[i] = v < 0 ? 0 : v > 255 ? 255 : v
  }
  return salida
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

// Decodificación ultra-rápida y precisa:
// 1. Barrido horizontal rápido (2ms)
// 2. Barrido vertical 90° (por si el código de barras está rotado en la caja de medicina)
// 3. Normalización de contraste para fotogramas deslavados
// 4. Centro ampliado profundo (QR pequeño/lejano de la prueba unitaria)
// 5. Barrido profundo en fotograma completo como respaldo
export function decodificarFotograma(
  luminancia: Uint8ClampedArray,
  ancho: number,
  alto: number,
): string | null {
  // 1. Barrido rápido horizontal
  const resDirecto = decodificarLuminancia(luminancia, ancho, alto, PISTAS_RAPIDAS)
  if (resDirecto) return resDirecto

  // 2. Barrido vertical 90° (detecta códigos de barras verticales al instante)
  const rot = rotar90(luminancia, ancho, alto)
  const resRotado = decodificarLuminancia(rot.luminancia, rot.ancho, rot.alto, PISTAS_RAPIDAS)
  if (resRotado) return resRotado

  // 3. Normalización de contraste si el fotograma es deslavado/gris
  const contrastado = mejorarContraste(luminancia)
  if (contrastado !== luminancia) {
    const resContraste = decodificarLuminancia(contrastado, ancho, alto, PISTAS_RAPIDAS)
    if (resContraste) return resContraste
  }

  // 4. Centro ampliado profundo (para códigos lejanos o pequeños en foco)
  const centro = ampliarCentro(luminancia, ancho, alto)
  const resCentro = decodificarLuminancia(centro, ancho, alto, PISTAS_PROFUNDAS)
  if (resCentro) return resCentro

  // 5. Barrido profundo en fotograma completo como respaldo
  return decodificarLuminancia(luminancia, ancho, alto, PISTAS_PROFUNDAS)
}

export interface DetectorNativo {
  tipo: 'nativo'
  detectarEnVideo: (video: HTMLVideoElement) => Promise<string | null>
  detectarEnCanvas: (canvas: HTMLCanvasElement) => Promise<string | null>
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance
  getSupportedFormats?: () => Promise<string[]>
}

export async function crearDetectorNativo(): Promise<DetectorNativo | null> {
  if (typeof window === 'undefined') return null
  const VentanaConDetector = window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
  if (typeof VentanaConDetector.BarcodeDetector !== 'function') return null

  try {
    const Constructor = VentanaConDetector.BarcodeDetector
    let formatosDisponibles: string[] = []
    if (typeof Constructor.getSupportedFormats === 'function') {
      formatosDisponibles = await Constructor.getSupportedFormats()
    }
    const formatosObjetivo = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e']
    const formatos = formatosObjetivo.filter(
      (f) => formatosDisponibles.length === 0 || formatosDisponibles.includes(f),
    )
    const detector = new Constructor({ formats: formatos })

    return {
      tipo: 'nativo',
      detectarEnVideo: async (video: HTMLVideoElement) => {
        if (video.readyState < 2 || video.videoWidth === 0) return null
        try {
          const items = await detector.detect(video)
          if (items && items.length > 0 && items[0].rawValue) {
            const raw = items[0].rawValue.trim()
            if (esCodigoValido(raw)) return raw
          }
        } catch {
          // Continuar normalmente
        }
        return null
      },
      detectarEnCanvas: async (canvas: HTMLCanvasElement) => {
        if (canvas.width === 0 || canvas.height === 0) return null
        try {
          const items = await detector.detect(canvas)
          if (items && items.length > 0 && items[0].rawValue) {
            const raw = items[0].rawValue.trim()
            if (esCodigoValido(raw)) return raw
          }
        } catch {
          // Continuar normalmente
        }
        return null
      },
    }
  } catch {
    return null
  }
}


