import test from 'node:test'
import assert from 'node:assert/strict'

import { decodificarFotograma, decodificarLuminancia } from '../src/lib/lectorCodigos.ts'
import { bitsEAN13, fotogramaEAN13, fotogramaQR } from './escenas.mjs'

const leer = ({ luminancia, ancho, alto }) => decodificarFotograma(luminancia, ancho, alto)

for (const valor of ['FDE:LOTE:1', 'FDE:MED:1']) {
  for (const px of [8, 5, 4]) {
    test(`QR del ERP ${valor} ocupando ${px}px por módulo en un fotograma de 1280x720`, () => {
      assert.equal(leer(fotogramaQR(valor, { px })), valor)
    })
  }
}

test('QR del ERP con giro, desenfoque y ruido de webcam', () => {
  assert.equal(leer(fotogramaQR('FDE:LOTE:1', { px: 5, giro: 0.4, desenfoque: 1, contraste: 90 })), 'FDE:LOTE:1')
})

test('QR del ERP con poco contraste (pantalla lejana)', () => {
  assert.equal(leer(fotogramaQR('FDE:LOTE:1', { px: 5, contraste: 60 })), 'FDE:LOTE:1')
})

for (const modulo of [3, 2]) {
  test(`EAN-13 con módulo de ${modulo}px en un fotograma de 1280x720`, () => {
    const { codigo, bits } = bitsEAN13('777000000001')
    assert.equal(codigo, '7770000000012')
    assert.equal(leer(fotogramaEAN13(bits, { modulo })), codigo)
  })
}

test('un fotograma sin código devuelve null en lugar de lanzar un error', () => {
  const ancho = 1280, alto = 720
  assert.equal(decodificarLuminancia(new Uint8ClampedArray(ancho * alto).fill(180), ancho, alto), null)
})

test('QR pequeño y borroso (3px por módulo, desenfoque fuerte) se lee con la ampliación del centro', () => {
  const f = fotogramaQR('FDE:LOTE:1', { px: 3, desenfoque: 2, contraste: 120 })
  assert.equal(leer(f), 'FDE:LOTE:1')
})

test('EAN-13 orientado verticalmente (90 grados) en el encuadre', () => {
  const { codigo, bits } = bitsEAN13('777000000001')
  const f = fotogramaEAN13(bits, { modulo: 3 })
  // Rotar el fotograma 90 grados
  const rotada = new Uint8ClampedArray(f.ancho * f.alto)
  for (let y = 0; y < f.alto; y++) {
    for (let x = 0; x < f.ancho; x++) {
      rotada[x * f.alto + (f.alto - 1 - y)] = f.luminancia[y * f.ancho + x]
    }
  }
  assert.equal(decodificarFotograma(rotada, f.alto, f.ancho), codigo)
})

