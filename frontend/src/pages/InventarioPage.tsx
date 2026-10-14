
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  FileBarChart2,
  Package,
  Pill,
  Plus,
  RefreshCw,
  QrCode,
  Search,
  Truck,
} from 'lucide-react'

import {
  actualizarMedicamento,
  getMedicamentos,
  getLotes,
  type Medicamento,
  type Lote,
} from '../services/inventarioService'
import { getUsuarioActual } from '../services/authService'
import CodigoQRDialog from '../components/CodigoQRDialog'

function InventarioPage() {
  const navigate = useNavigate()

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [medicamentoQR, setMedicamentoQR] = useState<Medicamento | null>(null)
  const [esAdministrador, setEsAdministrador] = useState(false)

  // Cargar medicamentos y lotes desde Django

  const cargarInventario = async () => {
    setCargando(true)
    setError('')

    try {
      const [datosMedicamentos, datosLotes, usuario] = await Promise.all([
        getMedicamentos(),
        getLotes(),
        getUsuarioActual(),
      ])

      setMedicamentos(datosMedicamentos)
      setLotes(datosLotes)
      setEsAdministrador(usuario.rol === 'administrador')
    } catch (err) {
      console.error('Error al cargar inventario:', err)
      setError('No se pudo cargar el inventario desde el servidor.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarInventario()
  }, [])

  // Calcular stock por medicamento

  const calcularStock = (medicamentoId: number): number => {
    return lotes
      .filter(
        (lote) =>
          lote.medicamento === medicamentoId &&
          lote.activo
      )
      .reduce(
        (total, lote) => total + Number(lote.cantidad_actual),
        0
      )
  }

  // Determinar estado del stock

  const obtenerEstadoStock = (
    stockActual: number,
    stockMinimo: number
  ) => {
    if (stockActual <= 0) {
      return {
        texto: 'Agotado',
        estilos: 'bg-red-100 text-red-700',
      }
    }

    if (stockActual <= stockMinimo) {
      return {
        texto: 'Crítico',
        estilos: 'bg-amber-100 text-amber-700',
      }
    }

    return {
      texto: 'Normal',
      estilos: 'bg-emerald-100 text-emerald-700',
    }
  }

  // Resumen del inventario

  const medicamentosActivos = medicamentos.filter(
    (medicamento) => medicamento.activo
  )

  const totalCriticos = medicamentosActivos.filter(
    (medicamento) => {
      const stock = calcularStock(medicamento.id)

      return stock > 0 && stock <= medicamento.stock_minimo
    }
  ).length

  const totalAgotados = medicamentosActivos.filter(
    (medicamento) => calcularStock(medicamento.id) <= 0
  ).length

  // Buscar medicamentos

  const medicamentosFiltrados = medicamentos.filter((medicamento) => {
    const texto = busqueda.toLowerCase().trim()

    return (
      medicamento.nombre.toLowerCase().includes(texto) ||
      (medicamento.codigo_barras ?? '').toLowerCase().includes(texto) ||
      (medicamento.principio_activo ?? '').toLowerCase().includes(texto)
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
              Consulta medicamentos, existencias y stock crítico.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void cargarInventario()}
              disabled={cargando}
              className="flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-3 font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>

            <button
              type="button"
              onClick={() => navigate('/inventario/lotes')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Package size={18} />
              Ver lotes
            </button>

            {esAdministrador && (
              <button
                type="button"
                onClick={() => navigate('/inventario/proveedores')}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Truck size={18} />
                Proveedores
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/inventario/identificar')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Barcode size={18} />
              Escanear código
            </button>

            {esAdministrador && (
              <button
                type="button"
                onClick={() => navigate('/inventario/reportes')}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FileBarChart2 size={18} />
                Reportes
              </button>
            )}

            {esAdministrador && <button
              type="button"
              onClick={() => navigate('/inventario/registrar')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={20} />
              Nuevo medicamento
            </button>}
          </div>
        </div>

        {/* Resumen */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <Package className="mb-3 text-blue-600" size={25} />
            <p className="text-sm text-slate-500">
              Medicamentos registrados
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {cargando ? '...' : error ? '--' : medicamentos.length}
            </p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <AlertTriangle className="mb-3 text-amber-500" size={25} />
            <p className="text-sm text-slate-500">
              Stock crítico
            </p>
            <p className="text-2xl font-bold text-amber-600">
              {cargando ? '...' : error ? '--' : totalCriticos}
            </p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <AlertTriangle className="mb-3 text-red-500" size={25} />
            <p className="text-sm text-slate-500">
              Medicamentos agotados
            </p>
            <p className="text-2xl font-bold text-red-600">
              {cargando ? '...' : error ? '--' : totalAgotados}
            </p>
          </section>
        </div>

        {/* Tabla de medicamentos */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
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

          {cargando ? (
            <p className="py-8 text-center text-slate-500">
              Cargando inventario...
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
              <table className="w-full min-w-[950px] text-left text-sm">
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
                      Stock actual
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Stock mínimo
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Estado del stock
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Estado
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {medicamentosFiltrados.map((medicamento) => {
                    const stockActual = calcularStock(medicamento.id)

                    const estadoStock = obtenerEstadoStock(
                      stockActual,
                      Number(medicamento.stock_minimo)
                    )

                    return (
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

                        <td className="px-4 py-4 text-slate-600">
                          <span className="inline-flex items-center gap-2">
                            <Barcode size={17} />
                            {medicamento.codigo_barras}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {stockActual}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {medicamento.stock_minimo}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${estadoStock.estilos}`}
                          >
                            {estadoStock.texto}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex gap-2">
                            {esAdministrador && <>
                            <button
                              type="button"
                              onClick={() => navigate(`/inventario/medicamentos/${medicamento.id}/editar`)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await actualizarMedicamento(medicamento.id, {
                                    activo: !medicamento.activo,
                                  })
                                  await cargarInventario()
                                } catch {
                                  setError('No se pudo cambiar el estado del medicamento.')
                                }
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {medicamento.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            </>}
                            <button
                              type="button"
                              onClick={() => setMedicamentoQR(medicamento)}
                              aria-label={`Mostrar QR de ${medicamento.nombre}`}
                              title="Mostrar QR"
                              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
                            >
                              <QrCode size={17} />
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              medicamento.activo
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {medicamento.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {medicamentoQR && (
        <CodigoQRDialog
          titulo={medicamentoQR.nombre}
          detalle={`Código de barras ${medicamentoQR.codigo_barras}`}
          valor={`FDE:MED:${medicamentoQR.id}`}
          onCerrar={() => setMedicamentoQR(null)}
        />
      )}
    </div>
  )
}

export default InventarioPage
