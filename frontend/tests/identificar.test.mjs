import test from 'node:test'
import assert from 'node:assert/strict'

import { identificarCodigo } from '../src/lib/identificarCodigo.ts'

const lote = { id: 1, numero_lote: 'PAR-2026-001', medicamento: 1 }
const medicamento = { id: 1, nombre: 'Paracetamol 500 mg', codigo_barras: '777000000001' }

function consultas(sobrescribir = {}) {
  const llamadas = []
  return {
    llamadas,
    getLote: async (id) => { llamadas.push(['lote', id]); return { ...lote, id } },
    getMedicamento: async (id) => { llamadas.push(['med', id]); return { ...medicamento, id } },
    getMedicamentoPorCodigo: async (codigo) => {
      llamadas.push(['codigo', codigo])
      return codigo === medicamento.codigo_barras ? medicamento : null
    },
    ...sobrescribir,
  }
}

test('FDE:LOTE:1 consulta el lote 1 y devuelve su información', async () => {
  const c = consultas()
  const r = await identificarCodigo('FDE:LOTE:1', c)
  assert.equal(r.tipo, 'lote')
  assert.equal(r.registro.numero_lote, 'PAR-2026-001')
  assert.deepEqual(c.llamadas, [['lote', 1]])
})

test('FDE:MED:1 consulta el medicamento 1', async () => {
  const c = consultas()
  const r = await identificarCodigo('  fde:med:1 ', c)
  assert.equal(r.tipo, 'medicamento')
  assert.deepEqual(c.llamadas, [['med', 1]])
})

test('código de barras registrado', async () => {
  const r = await identificarCodigo('777000000001', consultas())
  assert.equal(r.tipo, 'medicamento')
})

test('EAN-13 con dígito verificador encuentra el código registrado sin él', async () => {
  const r = await identificarCodigo('7770000000012', consultas())
  assert.equal(r.tipo, 'medicamento')
})

test('UPC-A de 12 dígitos prueba también el EAN-13 con cero inicial', async () => {
  const c = consultas({ getMedicamentoPorCodigo: async (codigo) => (codigo === '0123456789012' ? medicamento : null) })
  assert.equal((await identificarCodigo('123456789012', c)).tipo, 'medicamento')
})

test('código inexistente devuelve no_registrado', async () => {
  assert.deepEqual(await identificarCodigo('999999999999', consultas()), { tipo: 'no_registrado' })
})

test('QR del ERP cuyo lote ya no existe (404) devuelve no_registrado', async () => {
  const c = consultas({ getLote: async () => { throw { response: { status: 404 } } } })
  assert.deepEqual(await identificarCodigo('FDE:LOTE:9999', c), { tipo: 'no_registrado' })
})

test('un error de sesión (401) no se confunde con código no registrado', async () => {
  const c = consultas({ getLote: async () => { throw { response: { status: 401 } } } })
  await assert.rejects(identificarCodigo('FDE:LOTE:1', c), (e) => e.response.status === 401)
})
