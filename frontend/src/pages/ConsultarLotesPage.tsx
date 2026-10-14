
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PackagePlus, QrCode, RefreshCw, Truck } from 'lucide-react'
import axios from 'axios'

import {
  actualizarLote,
  getLotes,
  getProveedores,
  type Lote,
  type Proveedor,
} from '../services/inventarioService'
import { getUsuarioActual } from '../services/authService'
import CodigoQRDialog from '../components/CodigoQRDialog'

function ConsultarLotesPage() {
  const navigate = useNavigate()

  const [lotes, setLotes] = useState<Lote[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loteEditando, setLoteEditando] = useState<Lote | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [loteQR, setLoteQR] = useState<Lote | null>(null)
  const [esAdministrador, setEsAdministrador] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarLotes = async () => {
    setCargando(true)
    setError('')

    try {
      const [datos, listaProveedores, usuario] = await Promise.all([
        getLotes(),
        getProveedores(),
        getUsuarioActual(),
      ])
      setLotes(datos)
      setProveedores(listaProveedores)
      setEsAdministrador(usuario.rol === 'administrador')
    } catch (err) {
      console.error('Error al consultar lotes:', err)

      if (axios.isAxiosError(err)) {
        setError('No se pudieron cargar los lotes desde el servidor.')
      } else {
        setError('Ocurrió un error inesperado al consultar los lotes.')
      }
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarLotes()
  }, [])

  async function guardarMetadatos(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!loteEditando) return
    setGuardando(true)
    setError('')
    try {
      await actualizarLote(loteEditando.id, {
        fecha_vencimiento: loteEditando.fecha_vencimiento,
        precio_compra: loteEditando.precio_compra,
        precio_venta: loteEditando.precio_venta,
        proveedor: loteEditando.proveedor || null,
        activo: loteEditando.activo,
      })
      setMensaje('Lote actualizado.')
      setLoteEditando(null)
      await cargarLotes()
    } catch (err) {
      console.error('Error al actualizar lote:', err)
      if (axios.isAxiosError(err) && err.response?.data) {
        setError(JSON.stringify(err.response.data))
      } else {
        setError('No se pudo actualizar el lote.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
          <button
            type="button"
            onClick={() => navigate('/inventario')}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Volver al inventario"
          >
            <ArrowLeft size={24} />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Farmacia Díaz
            </h1>
            <p className="text-sm text-slate-500">
              Gestión de inventario
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Consultar lotes
            </h2>
            <p className="mt-2 text-slate-500">
              Revisa los lotes registrados y sus cantidades disponibles.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void cargarLotes()}
              disabled={cargando}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>

            {esAdministrador && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/inventario/lotes/registrar')}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  <PackagePlus size={18} />
                  Registrar lote
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/inventario/proveedores')}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Truck size={18} /> Proveedores
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}
        {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {cargando ? (
            <p className="p-8 text-center text-slate-500">
              Cargando lotes...
            </p>
          ) : lotes.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No hay lotes registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Medicamento</th>
                    <th className="px-5 py-4">Número de lote</th>
                    <th className="px-5 py-4">Proveedor</th>
                    <th className="px-5 py-4">Vencimiento</th>
                    <th className="px-5 py-4">Cantidad actual</th>
                    <th className="px-5 py-4">Precio compra</th>
                    <th className="px-5 py-4">Precio venta</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {lotes.map((lote) => (
                    <tr key={lote.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {lote.medicamento_nombre ?? `Medicamento #${lote.medicamento}`}
                      </td>

                      <td className="px-5 py-4">
                        {lote.numero_lote}
                      </td>

                      <td className="px-5 py-4">
                        {lote.proveedor_nombre ?? '—'}
                      </td>

                      <td className="px-5 py-4">
                        {lote.fecha_vencimiento.split('-').reverse().join('/')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {esAdministrador && <button
                          type="button"
                          onClick={() => setLoteEditando({ ...lote })}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </button>}
                        <button
                          type="button"
                          onClick={() => setLoteQR(lote)}
                          aria-label={`Mostrar QR del lote ${lote.numero_lote}`}
                          title="Mostrar QR"
                          className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
                        >
                          <QrCode size={17} />
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        {lote.cantidad_actual}
                      </td>

                      <td className="px-5 py-4">
                        Bs {lote.precio_compra}
                      </td>

                      <td className="px-5 py-4">
                        Bs {lote.precio_venta}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            lote.activo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {lote.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {loteEditando && esAdministrador && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="lote-editar-titulo" className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h2 id="lote-editar-titulo" className="text-xl font-bold text-slate-900">Editar lote</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">Solo se editan metadatos. Las existencias cambian mediante movimientos.</p>
            <form onSubmit={(evento) => void guardarMetadatos(evento)} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Proveedor
                <select value={loteEditando.proveedor ?? ''} onChange={(evento) => setLoteEditando((actual) => actual ? { ...actual, proveedor: evento.target.value ? Number(evento.target.value) : null } : actual)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                  <option value="">Sin proveedor</option>
                  {proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id} disabled={!proveedor.activo && proveedor.id !== loteEditando.proveedor}>{proveedor.nombre}{proveedor.activo ? '' : ' (inactivo)'}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Fecha de vencimiento<input type="date" required value={loteEditando.fecha_vencimiento} onChange={(evento) => setLoteEditando((actual) => actual ? { ...actual, fecha_vencimiento: evento.target.value } : actual)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
                <label className="text-sm font-medium text-slate-700">Precio de compra<input type="number" min="0" step="0.01" required value={loteEditando.precio_compra} onChange={(evento) => setLoteEditando((actual) => actual ? { ...actual, precio_compra: evento.target.value } : actual)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
                <label className="text-sm font-medium text-slate-700">Precio de venta<input type="number" min="0" step="0.01" required value={loteEditando.precio_venta} onChange={(evento) => setLoteEditando((actual) => actual ? { ...actual, precio_venta: evento.target.value } : actual)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={loteEditando.activo} disabled={loteEditando.cantidad_actual > 0} onChange={(evento) => setLoteEditando((actual) => actual ? { ...actual, activo: evento.target.checked } : actual)} /> Lote activo</label>
              </div>
              {loteEditando.cantidad_actual > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">El lote no se puede desactivar mientras conserve existencias.</p>}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setLoteEditando(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700">Cancelar</button><button type="submit" disabled={guardando} className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar cambios'}</button></div>
            </form>
          </section>
        </div>
      )}
      {loteQR && (
        <CodigoQRDialog
          titulo={`Lote ${loteQR.numero_lote}`}
          detalle={loteQR.medicamento_nombre ?? `Medicamento #${loteQR.medicamento}`}
          valor={`FDE:LOTE:${loteQR.id}`}
          onCerrar={() => setLoteQR(null)}
        />
      )}
    </main>
  )
}

export default ConsultarLotesPage
