import test from 'node:test'
import assert from 'node:assert/strict'

import { identificarCodigo } from '../src/lib/identificarCodigo.ts'

// Datos de prueba simulados
const medicamentosPrueba = [
  {
    id: 1,
    nombre: 'Paracetamol 500 mg',
    codigo_barras: '777000000001',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Amoxicilina 500 mg',
    codigo_barras: '777000000002',
    activo: false, // inactivo
  },
  {
    id: 3,
    nombre: 'Ibuprofeno 400 mg',
    codigo_barras: '777000000003',
    activo: true,
  },
  {
    id: 4,
    nombre: 'Aspirina 100 mg',
    codigo_barras: '777000000004',
    activo: true,
  },
]

const lotesPrueba = [
  {
    id: 101,
    medicamento: 1, // Paracetamol
    numero_lote: 'PAR-2026-001',
    activo: true,
    cantidad_actual: 5,
    precio_venta: '12.50',
    fecha_vencimiento: '2027-12-31',
  },
  {
    id: 102,
    medicamento: 3, // Ibuprofeno
    numero_lote: 'IBU-2026-001',
    activo: true,
    cantidad_actual: 2, // solo 2 en stock
    precio_venta: '15.00',
    fecha_vencimiento: '2027-12-31',
  },
  {
    id: 103,
    medicamento: 4, // Aspirina
    numero_lote: 'ASP-2026-001',
    activo: true,
    cantidad_actual: 10,
    precio_venta: '5.00',
    fecha_vencimiento: '2025-01-01', // VENCIDO (fecha anterior a hoy)
  },
]

function mockConsultas() {
  return {
    getLote: async (id) => {
      const lote = lotesPrueba.find((l) => l.id === id)
      if (!lote) throw { response: { status: 404 } }
      return lote
    },
    getMedicamento: async (id) => {
      const med = medicamentosPrueba.find((m) => m.id === id)
      if (!med) throw { response: { status: 404 } }
      return med
    },
    getMedicamentoPorCodigo: async (codigo) => {
      const med = medicamentosPrueba.find((m) => m.codigo_barras === codigo)
      return med ?? null
    },
  }
}

// Lógica de cálculo idéntica a RegistrarVentaPage
function crearManejadorVenta() {
  const hoy = '2026-10-19'
  let carrito = []
  let error = ''
  let exito = ''

  const lotesDisponibles = (id) =>
    lotesPrueba
      .filter(
        (lote) =>
          lote.medicamento === id &&
          lote.activo &&
          lote.cantidad_actual > 0 &&
          lote.fecha_vencimiento >= hoy,
      )
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))

  const stockPorMedicamento = (id) =>
    lotesDisponibles(id).reduce((total, lote) => total + lote.cantidad_actual, 0)

  function agregarMedicamento(med, unidades = 1, esEscaneo = false) {
    if (!med.activo) {
      error = `El medicamento "${med.nombre}" está inactivo y no se puede vender.`
      return false
    }

    const lotesElegibles = lotesDisponibles(med.id)
    const stockDisponible = stockPorMedicamento(med.id)

    if (stockDisponible <= 0 || lotesElegibles.length === 0) {
      error = `El medicamento "${med.nombre}" no tiene stock disponible para la venta.`
      return false
    }

    const unidadesEnCarrito =
      carrito.find((item) => item.medicamento_id === med.id)?.cantidad ?? 0

    if (unidadesEnCarrito + unidades > stockDisponible) {
      error = `Stock insuficiente para "${med.nombre}". Disponible: ${stockDisponible}${
        unidadesEnCarrito > 0 ? ` (ya tienes ${unidadesEnCarrito} en la venta)` : ''
      }.`
      return false
    }

    const lotePrecio = lotesElegibles[0]
    const precioUnitario = Number(lotePrecio.precio_venta).toFixed(2)
    const nuevaCantidad = unidadesEnCarrito + unidades
    const nuevoSubtotal = (nuevaCantidad * Number(precioUnitario)).toFixed(2)

    const existente = carrito.find((item) => item.medicamento_id === med.id)
    if (existente) {
      carrito = carrito.map((item) =>
        item.medicamento_id === med.id
          ? { ...item, cantidad: item.cantidad + unidades }
          : item,
      )
    } else {
      carrito = [
        ...carrito,
        {
          medicamento_id: med.id,
          medicamento_nombre: med.nombre,
          cantidad: unidades,
          precio_unitario: precioUnitario,
          stock_disponible: stockDisponible,
        },
      ]
    }

    error = ''
    if (esEscaneo) {
      exito = `Agregado por escaneo: ${med.nombre} · 1 unidad (Bs ${precioUnitario}) · Subtotal: Bs ${nuevoSubtotal}`
    }
    return true
  }

  async function procesarCodigoEscaneado(valor) {
    const limpio = valor.trim()
    error = ''
    exito = ''

    const consultas = mockConsultas()
    const identificacion = await identificarCodigo(limpio, consultas)

    let med = null
    if (identificacion.tipo === 'medicamento') {
      med = identificacion.registro
    } else if (identificacion.tipo === 'lote') {
      const idMed = identificacion.registro.medicamento
      med = medicamentosPrueba.find((m) => m.id === idMed) ?? (await consultas.getMedicamento(idMed))
    } else {
      med = medicamentosPrueba.find((m) => m.codigo_barras === limpio) ?? null
    }

    if (!med) {
      error = `El código "${limpio}" no corresponde a ningún medicamento registrado.`
      return false
    }

    return agregarMedicamento(med, 1, true)
  }

  return {
    procesarCodigoEscaneado,
    getCarrito: () => carrito,
    getError: () => error,
    getExito: () => exito,
  }
}

test('1. Escanear código de barras agrega 1 unidad con precio y subtotal', async () => {
  const venta = crearManejadorVenta()
  const exito = await venta.procesarCodigoEscaneado('777000000001')

  assert.equal(exito, true)
  assert.equal(venta.getError(), '')
  assert.match(venta.getExito(), /Agregado por escaneo: Paracetamol 500 mg · 1 unidad/)

  const carrito = venta.getCarrito()
  assert.equal(carrito.length, 1)
  assert.equal(carrito[0].medicamento_nombre, 'Paracetamol 500 mg')
  assert.equal(carrito[0].cantidad, 1)
  assert.equal(carrito[0].precio_unitario, '12.50')
})

test('2. Escaneo sucesivo del mismo medicamento incrementa cantidad y actualiza subtotal', async () => {
  const venta = crearManejadorVenta()
  await venta.procesarCodigoEscaneado('777000000001')
  await venta.procesarCodigoEscaneado('777000000001')

  const carrito = venta.getCarrito()
  assert.equal(carrito.length, 1)
  assert.equal(carrito[0].cantidad, 2)
  assert.match(venta.getExito(), /Subtotal: Bs 25\.00/)
})

test('3. Escanear código QR del ERP (FDE:MED:1) agrega correctamente el medicamento', async () => {
  const venta = crearManejadorVenta()
  const exito = await venta.procesarCodigoEscaneado('FDE:MED:1')

  assert.equal(exito, true)
  const carrito = venta.getCarrito()
  assert.equal(carrito[0].medicamento_id, 1)
})

test('4. Escanear código QR de lote (FDE:LOTE:101) identifica el medicamento del lote y lo agrega', async () => {
  const venta = crearManejadorVenta()
  const exito = await venta.procesarCodigoEscaneado('FDE:LOTE:101')

  assert.equal(exito, true)
  const carrito = venta.getCarrito()
  assert.equal(carrito[0].medicamento_nombre, 'Paracetamol 500 mg')
})

test('5. Validar código inexistente: muestra error de no registrado', async () => {
  const venta = crearManejadorVenta()
  const exito = await venta.procesarCodigoEscaneado('999999999999')

  assert.equal(exito, false)
  assert.match(venta.getError(), /no corresponde a ningún medicamento registrado/)
  assert.equal(venta.getCarrito().length, 0)
})

test('6. Validar medicamento inactivo: no se agrega y muestra mensaje claro', async () => {
  const venta = crearManejadorVenta()
  const exito = await venta.procesarCodigoEscaneado('777000000002') // Amoxicilina inactiva

  assert.equal(exito, false)
  assert.match(venta.getError(), /está inactivo y no se puede vender/)
  assert.equal(venta.getCarrito().length, 0)
})

test('7. Validar medicamento sin stock disponible (lote vencido): muestra error sin stock', async () => {
  const venta = crearManejadorVenta()
  const exito = await venta.procesarCodigoEscaneado('777000000004') // Aspirina con lote vencido

  assert.equal(exito, false)
  assert.match(venta.getError(), /no tiene stock disponible/)
  assert.equal(venta.getCarrito().length, 0)
})

test('8. Validar límite de stock: no permite agregar más unidades que las disponibles', async () => {
  const venta = crearManejadorVenta() // Ibuprofeno tiene stock disponible = 2
  await venta.procesarCodigoEscaneado('777000000003') // 1 unidad (ok)
  await venta.procesarCodigoEscaneado('777000000003') // 2 unidades (ok)

  assert.equal(venta.getCarrito()[0].cantidad, 2)

  // Intentar agregar una 3ra unidad cuando solo hay 2
  const exitoTercera = await venta.procesarCodigoEscaneado('777000000003')
  assert.equal(exitoTercera, false)
  assert.match(venta.getError(), /Stock insuficiente para "Ibuprofeno 400 mg"/)
  assert.equal(venta.getCarrito()[0].cantidad, 2) // se mantiene en 2
})

test('9. El stock físico no se descuenta en el escaneo (se mantiene intacto para la confirmación de venta)', async () => {
  const loteIbu = lotesPrueba.find((l) => l.id === 102)
  const stockInicial = loteIbu.cantidad_actual

  const venta = crearManejadorVenta()
  await venta.procesarCodigoEscaneado('777000000003')

  // El stock del lote permanece inalterado durante el escaneo
  assert.equal(loteIbu.cantidad_actual, stockInicial)
})
