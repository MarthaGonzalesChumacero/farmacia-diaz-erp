
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ArrowLeft,
  Barcode,
  Package,
  Pill,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'

import {
  getMedicamentos,
  type Medicamento,
} from '../services/inventarioService'

function InventarioPage() {
  const navigate = useNavigate()

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // ======================================
  // Cargar medicamentos desde Django
  // ======================================

  const cargarMedicamentos = async () => {
    setCargando(true)
    setError('')

    try {
      const datos = await getMedicamentos()
      setMedicamentos(datos)
    } catch (error) {
      console.error('Error al cargar inventario:', error)
      setError('No se pudieron cargar los medicamentos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarMedicamentos()
  }, [])

  // ======================================
  // Buscar medicamentos
  // ======================================

  const medicamentosFiltrados = medicamentos.filter((medicamento) => {
    const texto = busqueda.toLowerCase().trim()

    return (
      medicamento.nombre.toLowerCase().includes(texto) ||
      medicamento.codigo_barras.toLowerCase().includes(texto) ||
      medicamento.principio_activo.toLowerCase().includes(texto)
    )
  })

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Encabezado */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="Volver al panel principal"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Pill size={25} />
          </div>

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

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* Título y botones */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Inventario de medicamentos
            </h2>

            <p className="mt-2 text-slate-500">
              Consulta y administra los medicamentos registrados en el sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* Botón actualizar */}

            <button
              type="button"
              onClick={() => void cargarMedicamentos()}
              disabled={cargando}
              className="flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-3 font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>

            {/* Botón registrar medicamento */}

            <button
              type="button"
              onClick={() => navigate('/inventario/registrar')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={20} />
              Nuevo medicamento
            </button>

          </div>
        </div>

        {/* Total de medicamentos */}

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">

            <Package className="text-blue-600" size={24} />

            <div>
              <p className="text-sm text-slate-500">
                Medicamentos registrados
              </p>

              <p className="text-2xl font-bold text-slate-900">
                {cargando ? '...' : error ? '--' : medicamentos.length}
              </p>
            </div>

          </div>
        </section>

        {/* Tabla de medicamentos */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          {/* Buscador */}

          <div className="relative mb-6">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, código de barras o principio activo"
              className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Estados de carga */}

          {cargando ? (
            <p className="py-8 text-center text-slate-500">
              Cargando medicamentos...
            </p>
          ) : error ? (
            <p role="alert" className="py-8 text-center text-red-600">
              {error}
            </p>
          ) : medicamentosFiltrados.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No se encontraron medicamentos.
            </p>
          ) : (

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">

                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Medicamento
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Principio activo
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Presentación
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Código de barras
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {medicamentosFiltrados.map((medicamento) => (

                    <tr
                      key={medicamento.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >

                      <td className="px-4 py-4 font-medium text-slate-900">
                        {medicamento.nombre}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {medicamento.principio_activo}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {medicamento.presentacion}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Barcode size={17} />
                          {medicamento.codigo_barras}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            medicamento.activo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {medicamento.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                    </tr>

                  ))}
                </tbody>

              </table>
            </div>

          )}

        </section>
      </main>
    </div>
  )
}

export default InventarioPage
