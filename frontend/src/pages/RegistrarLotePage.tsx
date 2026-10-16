
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, PackagePlus, Save, Truck } from 'lucide-react'
import {
  crearLote,
  getMedicamentos,
  getProveedores,
  type Medicamento,
  type NuevoLote,
  type Proveedor,
} from '../services/inventarioService'

const formularioInicial = {
  medicamento: '',
  proveedor: '',
  numero_lote: '',
  fecha_vencimiento: '',
  cantidad_inicial: '',
  precio_compra: '',
  precio_venta: '',
}

function RegistrarLotePage() {
  const navigate = useNavigate()

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [guardando, setGuardando] = useState(false)
  const [cargandoMedicamentos, setCargandoMedicamentos] = useState(true)
  const [cargandoProveedores, setCargandoProveedores] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    async function cargarMedicamentos() {
      try {
        const [datos, listaProveedores] = await Promise.all([
          getMedicamentos(),
          getProveedores(),
        ])
        setMedicamentos(datos.filter((medicamento) => medicamento.activo))
        setProveedores(listaProveedores.filter((proveedor) => proveedor.activo))
      } catch {
        setError('No se pudo cargar el catálogo de medicamentos y proveedores.')
      } finally {
        setCargandoMedicamentos(false)
        setCargandoProveedores(false)
      }
    }

    void cargarMedicamentos()
  }, [])

  function actualizarCampo(campo: keyof typeof formulario, valor: string) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
    setError('')
    setExito('')
  }

  async function guardarLote(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')
    setExito('')

    const cantidad = Number(formulario.cantidad_inicial)
    const precioCompra = Number(formulario.precio_compra)
    const precioVenta = Number(formulario.precio_venta)

    if (!formulario.medicamento) {
      setError('Selecciona un medicamento.')
      return
    }

    if (!formulario.numero_lote.trim()) {
      setError('Ingresa el número de lote.')
      return
    }

    if (!formulario.fecha_vencimiento) {
      setError('Selecciona la fecha de vencimiento.')
      return
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setError('La cantidad inicial debe ser un número entero mayor que cero.')
      return
    }

    if (
      !Number.isFinite(precioCompra) ||
      !Number.isFinite(precioVenta) ||
      precioCompra < 0 ||
      precioVenta < 0
    ) {
      setError('Los precios deben ser números válidos y no negativos.')
      return
    }

    const nuevoLote: NuevoLote = {
      medicamento: Number(formulario.medicamento),
      proveedor: formulario.proveedor ? Number(formulario.proveedor) : null,
      numero_lote: formulario.numero_lote.trim(),
      fecha_vencimiento: formulario.fecha_vencimiento,
      cantidad_inicial: cantidad,
      precio_compra: precioCompra.toFixed(2),
      precio_venta: precioVenta.toFixed(2),
      activo: true,
    }

    setGuardando(true)

    try {
      await crearLote(nuevoLote)
      setExito('Lote registrado correctamente.')
      setFormulario(formularioInicial)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detalles = err.response?.data

        if (detalles && typeof detalles === 'object') {
          const mensaje = Object.entries(detalles)
            .map(([campo, valor]) => `${campo}: ${String(valor)}`)
            .join(' | ')

          setError(mensaje || 'No se pudo registrar el lote.')
        } else {
          setError('No se pudo registrar el lote. Verifica la conexión.')
        }
      } else {
        setError('Ocurrió un error inesperado.')
      }
    } finally {
      setGuardando(false)
    }
  }

  const estiloCampo =
    'w-full rounded-xl border border-app-border bg-app-card px-4 py-3 text-app-text outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30'

  return (
    <div className="bg-app-bg">
      <header className="border-b border-app-border bg-app-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-5">
          <button
            type="button"
            onClick={() => navigate('/inventario')}
            className="rounded-xl p-2 text-app-muted hover:bg-app-bg"
            aria-label="Volver al inventario"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <PackagePlus size={25} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-app-text">
              Farmacia Díaz
            </h1>
            <p className="text-sm text-app-muted">
              Gestión de inventario
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-app-text">
            Registrar lote
          </h2>
          <p className="mt-2 text-app-muted">
            Registra un lote de un medicamento con su fecha de
            vencimiento, cantidad y precios.
          </p>
        </div>

        <form
          onSubmit={(evento) => void guardarLote(evento)}
          className="rounded-2xl border border-app-border bg-app-card p-6 shadow-sm sm:p-8"
        >
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {exito && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {exito}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="medicamento"
                className="mb-2 block text-sm font-semibold text-app-text"
              >
                Medicamento *
              </label>
              <select
                id="medicamento"
                required
                className={estiloCampo}
                value={formulario.medicamento}
                disabled={cargandoMedicamentos}
                onChange={(e) =>
                  actualizarCampo('medicamento', e.target.value)
                }
              >
                <option value="">
                  {cargandoMedicamentos
                    ? 'Cargando medicamentos...'
                    : 'Seleccionar medicamento'}
                </option>

                {medicamentos.map((medicamento) => (
                  <option key={medicamento.id} value={medicamento.id}>
                    {medicamento.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="proveedor"
                className="mb-2 block text-sm font-semibold text-app-text"
              >
                Proveedor
              </label>
              <select
                id="proveedor"
                className={estiloCampo}
                value={formulario.proveedor}
                disabled={cargandoProveedores}
                onChange={(e) => actualizarCampo('proveedor', e.target.value)}
              >
                <option value="">Sin proveedor asociado</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
              {proveedores.length === 0 && !cargandoProveedores && (
                <button
                  type="button"
                  onClick={() => navigate('/inventario/proveedores')}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-sky-800 hover:underline"
                >
                  <Truck size={16} /> Registrar proveedor
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor="numero_lote"
                className="mb-2 block text-sm font-semibold text-app-text"
              >
                Número de lote *
              </label>
              <input
                id="numero_lote"
                type="text"
                required
                className={estiloCampo}
                placeholder="Ej. PAR-2026-002"
                value={formulario.numero_lote}
                onChange={(e) =>
                  actualizarCampo('numero_lote', e.target.value)
                }
              />
            </div>

            <div>
              <label
                htmlFor="fecha_vencimiento"
                className="mb-2 block text-sm font-semibold text-app-text"
              >
                Fecha de vencimiento *
              </label>
              <input
                id="fecha_vencimiento"
                type="date"
                required
                className={estiloCampo}
                value={formulario.fecha_vencimiento}
                onChange={(e) =>
                  actualizarCampo('fecha_vencimiento', e.target.value)
                }
              />
            </div>

            <div>
              <label
                htmlFor="cantidad_inicial"
                className="mb-2 block text-sm font-semibold text-app-text"
              >
                Cantidad inicial *
              </label>
              <input
                id="cantidad_inicial"
                type="number"
                min="1"
                step="1"
                required
                className={estiloCampo}
                placeholder="Ej. 100"
                value={formulario.cantidad_inicial}
                onChange={(e) =>
                  actualizarCampo('cantidad_inicial', e.target.value)
                }
              />
            </div>

            <div>
              <label
                htmlFor="precio_compra"
                className="mb-2 block text-sm font-semibold text-app-text"
              >
                Precio de compra (Bs) *
              </label>
              <input
                id="precio_compra"
                type="number"
                min="0"
                step="0.01"
                required
                className={estiloCampo}
                placeholder="Ej. 5.00"
                value={formulario.precio_compra}
                onChange={(e) =>
                  actualizarCampo('precio_compra', e.target.value)
                }
              />
            </div>

            <div>
              <label
                htmlFor="precio_venta"
                className="mb-2 block text-sm font-semibold text-app-text"
              >
                Precio de venta (Bs) *
              </label>
              <input
                id="precio_venta"
                type="number"
                min="0"
                step="0.01"
                required
                className={estiloCampo}
                placeholder="Ej. 8.00"
                value={formulario.precio_venta}
                onChange={(e) =>
                  actualizarCampo('precio_venta', e.target.value)
                }
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-app-border pt-6">
            <button
              type="button"
              onClick={() => navigate('/inventario')}
              className="rounded-xl border border-app-border px-5 py-3 font-medium text-app-text hover:bg-app-bg"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando || cargandoMedicamentos || cargandoProveedores}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {guardando ? 'Guardando...' : 'Guardar lote'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default RegistrarLotePage
