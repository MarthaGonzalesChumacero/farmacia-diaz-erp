import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'

// Generador determinista para que las pruebas sean repetibles.
export function aleatorio(semilla = 12345) {
  let s = semilla
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
}

// Matriz de módulos del QR tal como lo dibuja el ERP (CodigoQRDialog: nivel M, margen 4).
export function matrizQR(valor) {
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value: valor, size: 224, level: 'M', marginSize: 4 }))
  const n = Number(/viewBox="0 0 (\d+)/.exec(svg)[1])
  const oscuro = new Uint8Array(n * n)
  for (const m of /fill="#000000" d="([^"]+)"/.exec(svg)[1].matchAll(/M(\d+)[ ,](\d+)\s?h(\d+)v1/g))
    for (let i = 0; i < +m[3]; i += 1) oscuro[+m[2] * n + +m[1] + i] = 1
  return { n, oscuro }
}

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = L.map((s) => [...s].map((c) => (c === '0' ? '1' : '0')).join(''))
const PARIDAD = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export function bitsEAN13(doce) {
  const d = [...doce].map(Number)
  const verificador = (10 - (d.reduce((a, v, i) => a + v * (i % 2 ? 3 : 1), 0) % 10)) % 10
  const todos = [...d, verificador]
  let bits = '101'
  for (let i = 1; i <= 6; i += 1) bits += (PARIDAD[todos[0]][i - 1] === 'L' ? L : G)[todos[i]]
  bits += '01010'
  for (let i = 7; i <= 12; i += 1) bits += R[todos[i]]
  return { codigo: todos.join(''), bits: `${bits}101` }
}

function desenfocar(a, W, H, pasadas) {
  let actual = a
  for (let p = 0; p < pasadas; p += 1) {
    const b = Float32Array.from(actual)
    for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
      let t = 0
      for (let j = -1; j <= 1; j += 1) for (let i = -1; i <= 1; i += 1) t += actual[(y + j) * W + x + i]
      b[y * W + x] = t / 9
    }
    actual = b
  }
  return actual
}

function aFotograma(valores, W, H, ruido, azar) {
  const out = new Uint8ClampedArray(W * H)
  for (let i = 0; i < out.length; i += 1) out[i] = valores[i] + (azar() - 0.5) * ruido
  return { luminancia: out, ancho: W, alto: H }
}

// Fotograma 1280x720 de una webcam: fondo gris y un QR centrado, rotado, borroso y con ruido.
export function fotogramaQR(valor, { px, giro = 0, desenfoque = 0, contraste = 120, ruido = 20 }) {
  const W = 1280, H = 720
  const { n, oscuro } = matrizQR(valor)
  const g = new Float32Array(W * H).fill(200)
  const c = Math.cos(giro), s = Math.sin(giro)
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const dx = x - W / 2, dy = y - H / 2
    const u = (dx * c + dy * s) / px + n / 2, v = (-dx * s + dy * c) / px + n / 2
    if (u >= 0 && v >= 0 && u < n && v < n) g[y * W + x] = oscuro[Math.floor(v) * n + Math.floor(u)] ? 200 - contraste : 235
  }
  return aFotograma(desenfocar(g, W, H, desenfoque), W, H, ruido, aleatorio())
}

export function fotogramaEAN13(bits, { modulo, alto = 160, desenfoque = 0, ruido = 20 }) {
  const W = 1280, H = 720
  const g = new Float32Array(W * H).fill(215)
  const x0 = Math.floor((W - bits.length * modulo) / 2), y0 = Math.floor((H - alto) / 2)
  for (let y = y0; y < y0 + alto; y += 1) for (let i = 0; i < bits.length; i += 1) {
    for (let dx = 0; dx < modulo; dx += 1) g[y * W + x0 + i * modulo + dx] = bits[i] === '1' ? 40 : 235
  }
  return aFotograma(desenfocar(g, W, H, desenfoque), W, H, ruido, aleatorio())
}
