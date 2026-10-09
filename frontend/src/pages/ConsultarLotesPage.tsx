
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PackagePlus, RefreshCw } from 'lucide-react'
import axios from 'axios'

import { getLotes, type Lote } from '../services/inventarioService'

function ConsultarLotesPage() {
  const navigate = useNavigate()

  const [lotes, setLotes] = useState<Lote[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarLotes = async () => {
    setCargando(true)
    setError('')

    try {
      const datos = await getLotes()
      setLotes(datos)
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

            <button
              type="button"
              onClick={() => navigate('/inventario/lotes/registrar')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <PackagePlus size={18} />
              Registrar lote
            </button>
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
                    <th className="px-5 py-4">Vencimiento</th>
                    <th className="px-5 py-4">Cantidad actual</th>
                    <th className="px-5 py-4">Precio compra</th>
                    <th className="px-5 py-4">Precio venta</th>
                    <th className="px-5 py-4">Estado</th>
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
                        {lote.fecha_vencimiento.split('-').reverse().join('/')}
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
    </main>
  )
}

export default ConsultarLotesPage
