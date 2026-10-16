import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Barcode, RefreshCw, Search } from 'lucide-react'

import BarcodeScanner from '../components/BarcodeScanner'
import { identificarCodigo } from '../lib/identificarCodigo'
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

function mensajeDeError(err: unknown) {
  if (!axios.isAxiosError(err)) return 'No se pudo consultar el elemento identificado.'
  if (!err.response) return 'No se pudo conectar con el servidor de inventario.'
  if (err.response.status === 401) return 'La sesión expiró. Cierra sesión y vuelve a ingresar.'
  if (err.response.status === 403) return 'Tu usuario no tiene permiso para consultar este elemento.'
  return `No se pudo consultar el elemento identificado (error ${err.response.status}).`
}

function IdentificarCodigoPage() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [lectorId, setLectorId] = useState(0)
  async function identificar(valor: string) {
    const limpio = valor.trim()
    if (!limpio) return
    setCodigo(limpio)
    setCargando(true)
    setError('')
    setResultado(null)

    try {
      const identificacion = await identificarCodigo(limpio, {
        getMedicamento,
        getLote,
        getMedicamentoPorCodigo,
      })
      if (identificacion.tipo === 'no_registrado') {
        setError('Código no registrado.')
      } else {
        setResultado(identificacion)
      }
    } catch (err) {
      console.error('Error al consultar el código escaneado:', err)
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="bg-app-bg">
      <header className="border-b border-app-border bg-app-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <button type="button" onClick={() => navigate('/inventario')} aria-label="Volver al inventario" className="rounded-lg p-2 text-app-muted hover:bg-app-bg"><ArrowLeft size={21} /></button>
          <div><h1 className="text-xl font-bold text-app-text">Identificar producto</h1><p className="text-sm text-app-muted">QR de Farmacia Díaz o código de barras</p></div>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-app-border bg-app-card p-5">
          <h2 className="mb-4 font-semibold text-app-text">Lector de cámara</h2>
          <BarcodeScanner key={lectorId} onDetected={(value) => void identificar(value)} />
          <button
            type="button"
            onClick={() => { setResultado(null); setError(''); setCodigo(''); setLectorId((n) => n + 1) }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-sm font-medium text-app-text hover:bg-app-bg"
          >
            <RefreshCw size={16} />
            Escanear otro código
          </button>
          <form onSubmit={(evento) => { evento.preventDefault(); void identificar(codigo) }} className="mt-4 flex gap-2">
            <input value={codigo} onChange={(evento) => setCodigo(evento.target.value)} placeholder="Escanea con lector USB o escribe el código" className="min-w-0 flex-1 rounded-lg border border-app-border px-3 py-2.5" />
            <button type="submit" disabled={cargando || !codigo.trim()} aria-label="Buscar código" className="rounded-lg bg-[#003F63] p-3 text-white disabled:opacity-50"><Search size={18} /></button>
          </form>
          {cargando && <p className="mt-3 text-sm text-app-muted">Buscando...</p>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>

        <section className="h-fit rounded-xl border border-app-border bg-app-card p-5">
          <h2 className="mb-4 font-semibold text-app-text">Resultado</h2>
          {!resultado ? (
            <p className="py-8 text-center text-sm text-app-muted">El elemento identificado aparecerá aquí.</p>
          ) : resultado.tipo === 'medicamento' ? (
            <div className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-800"><Barcode size={22} /></div>
              <p className="text-xs font-semibold uppercase text-app-muted">Medicamento</p>
              <h3 className="text-xl font-bold text-app-text">{resultado.registro.nombre}</h3>
              <p className="text-sm text-app-muted">{resultado.registro.principio_activo} · {resultado.registro.presentacion}</p>
              <p className="text-sm text-app-muted">Código: {resultado.registro.codigo_barras}</p>
              <p className="text-sm text-app-muted">Estado: {resultado.registro.activo ? 'Activo' : 'Inactivo'}</p>
              <button type="button" onClick={() => navigate('/inventario/stock')} className="mt-2 rounded-lg border border-app-border px-4 py-2 text-sm font-semibold text-app-text hover:bg-app-bg">Ver control de stock</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-app-muted">Lote</p>
              <h3 className="text-xl font-bold text-app-text">{resultado.registro.medicamento_nombre ?? `Medicamento #${resultado.registro.medicamento}`}</h3>
              <p className="text-sm text-app-muted">Lote {resultado.registro.numero_lote}</p>
              <p className="text-sm text-app-muted">Vence: {resultado.registro.fecha_vencimiento}</p>
              <p className="text-sm text-app-muted">Existencias: {resultado.registro.cantidad_actual}</p>
              <p className="text-sm text-app-muted">Estado: {resultado.registro.activo ? 'Activo' : 'Inactivo'}</p>
              <button type="button" onClick={() => navigate('/inventario/stock')} className="mt-2 rounded-lg border border-app-border px-4 py-2 text-sm font-semibold text-app-text hover:bg-app-bg">Ver control de stock</button>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default IdentificarCodigoPage