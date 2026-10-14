import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Barcode, Search } from 'lucide-react'

import BarcodeScanner from '../components/BarcodeScanner'
import {
  getLote,
  getMedicamento,
  getMedicamentoPorCodigo,
  type Lote,
  type Medicamento,
} from '../services/inventarioService'

type Resultado =
  | { tipo: 'medicamento'; registro: Medicamento }
  | { tipo: 'lote'; registro: Lote }

function IdentificarCodigoPage() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function identificar(valor: string) {
    const limpio = valor.trim()
    if (!limpio) return
    setCodigo(limpio)
    setCargando(true)
    setError('')
    setResultado(null)

    try {
      const identificador = /^FDE:(MED|LOTE):(\d+)$/i.exec(limpio)
      if (identificador?.[1].toUpperCase() === 'MED') {
        setResultado({
          tipo: 'medicamento',
          registro: await getMedicamento(Number(identificador[2])),
        })
      } else if (identificador?.[1].toUpperCase() === 'LOTE') {
        setResultado({
          tipo: 'lote',
          registro: await getLote(Number(identificador[2])),
        })
      } else {
        const medicamento = await getMedicamentoPorCodigo(limpio)
        if (!medicamento) {
          setError('No se encontró un medicamento con ese código.')
        } else {
          setResultado({ tipo: 'medicamento', registro: medicamento })
        }
      }
    } catch {
      setError('No se pudo consultar el elemento identificado.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <button type="button" onClick={() => navigate('/inventario')} aria-label="Volver al inventario" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} /></button>
          <div><h1 className="text-xl font-bold text-slate-900">Identificar producto</h1><p className="text-sm text-slate-500">QR de Farmacia Díaz o código de barras</p></div>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Lector de cámara</h2>
          <BarcodeScanner onDetected={(value) => void identificar(value)} />
          <form onSubmit={(evento) => { evento.preventDefault(); void identificar(codigo) }} className="mt-4 flex gap-2">
            <input value={codigo} onChange={(evento) => setCodigo(evento.target.value)} placeholder="Escanea con lector USB o escribe el código" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5" />
            <button type="submit" disabled={cargando || !codigo.trim()} aria-label="Buscar código" className="rounded-lg bg-slate-900 p-3 text-white disabled:opacity-50"><Search size={18} /></button>
          </form>
          {cargando && <p className="mt-3 text-sm text-slate-500">Buscando...</p>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>

        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Resultado</h2>
          {!resultado ? (
            <p className="py-8 text-center text-sm text-slate-500">El elemento identificado aparecerá aquí.</p>
          ) : resultado.tipo === 'medicamento' ? (
            <div className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-800"><Barcode size={22} /></div>
              <p className="text-xs font-semibold uppercase text-slate-500">Medicamento</p>
              <h3 className="text-xl font-bold text-slate-900">{resultado.registro.nombre}</h3>
              <p className="text-sm text-slate-600">{resultado.registro.principio_activo} · {resultado.registro.presentacion}</p>
              <p className="text-sm text-slate-600">Código: {resultado.registro.codigo_barras}</p>
              <p className="text-sm text-slate-600">Estado: {resultado.registro.activo ? 'Activo' : 'Inactivo'}</p>
              <button type="button" onClick={() => navigate('/inventario/stock')} className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver control de stock</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Lote</p>
              <h3 className="text-xl font-bold text-slate-900">{resultado.registro.medicamento_nombre ?? `Medicamento #${resultado.registro.medicamento}`}</h3>
              <p className="text-sm text-slate-600">Lote {resultado.registro.numero_lote}</p>
              <p className="text-sm text-slate-600">Vence: {resultado.registro.fecha_vencimiento}</p>
              <p className="text-sm text-slate-600">Existencias: {resultado.registro.cantidad_actual}</p>
              <p className="text-sm text-slate-600">Estado: {resultado.registro.activo ? 'Activo' : 'Inactivo'}</p>
              <button type="button" onClick={() => navigate('/inventario/stock')} className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver control de stock</button>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default IdentificarCodigoPage