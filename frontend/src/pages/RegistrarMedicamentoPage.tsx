
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  CheckCircle2,
  Pill,
  Save,
} from 'lucide-react'

import {
  crearMedicamento,
  type NuevoMedicamento,
} from '../services/inventarioService'

const formularioInicial: NuevoMedicamento = {
  nombre: '',
  principio_activo: '',
  presentacion: '',
  codigo_barras: '',
  registro_sanitario: '',
  descripcion: '',
  stock_minimo: 0,
  unidad_medida: 'unidad',
}

function RegistrarMedicamentoPage() {
  const navigate = useNavigate()

  const [formulario, setFormulario] =
    useState<NuevoMedicamento>({ ...formularioInicial })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const actualizarCampo = (
    campo: keyof NuevoMedicamento,
    valor: string | number,
  ) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  const guardarMedicamento = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (guardando) return

    setError('')
    setExito(false)

    if (
      !formulario.nombre.trim() ||
      !formulario.principio_activo.trim() ||
      !formulario.presentacion.trim() ||
      !formulario.codigo_barras.trim()
    ) {
      setError('Completa todos los campos obligatorios.')
      return
    }

    if ((formulario.stock_minimo ?? 0) < 0) {
      setError('El stock mínimo no puede ser negativo.')
      return
    }

    setGuardando(true)

    try {
      await crearMedicamento(formulario)
      setExito(true)
      setFormulario({ ...formularioInicial })
    } catch (err) {
      console.error('Error al registrar medicamento:', err)

      if (axios.isAxiosError(err) && err.response?.data) {
        const detalles = err.response.data
        const mensaje =
          typeof detalles === 'string'
            ? detalles
            : JSON.stringify(detalles)

        setError(`No se pudo registrar el medicamento: ${mensaje}`)
      } else {
        setError('No se pudo registrar el medicamento. Verifica la conexión.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate('/inventario')}
            aria-label="Volver al inventario"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
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

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-7">
          <h2 className="text-3xl font-bold text-slate-900">
            Registrar medicamento
          </h2>

          <p className="mt-2 text-slate-500">
            Ingresa los datos del nuevo medicamento.
          </p>
        </div>

        <form
          onSubmit={guardarMedicamento}
          className="rounded-2xl bg-white p-6 shadow-sm md:p-8"
        >
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {exito && (
            <div
              role="status"
              className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              <CheckCircle2 size={20} />
              Medicamento registrado correctamente.
            </div>
          )}

          <h3 className="mb-5 text-lg font-semibold text-slate-900">
            Información del medicamento
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="nombre"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nombre del medicamento *
              </label>
              <input
                id="nombre"
                type="text"
                required
                maxLength={150}
                value={formulario.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                placeholder="Ej. Ibuprofeno 400 mg"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="principio_activo"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Principio activo *
              </label>
              <input
                id="principio_activo"
                type="text"
                required
                maxLength={150}
                value={formulario.principio_activo}
                onChange={(e) =>
                  actualizarCampo('principio_activo', e.target.value)
                }
                placeholder="Ej. Ibuprofeno"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="presentacion"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Presentación *
              </label>
              <input
                id="presentacion"
                type="text"
                required
                maxLength={100}
                value={formulario.presentacion}
                onChange={(e) =>
                  actualizarCampo('presentacion', e.target.value)
                }
                placeholder="Ej. Tableta 400 mg"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="codigo_barras"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Código de barras *
              </label>
              <input
                id="codigo_barras"
                type="text"
                required
                maxLength={50}
                value={formulario.codigo_barras}
                onChange={(e) =>
                  actualizarCampo('codigo_barras', e.target.value)
                }
                placeholder="Ej. 777000000002"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="registro_sanitario"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Registro sanitario
              </label>
              <input
                id="registro_sanitario"
                type="text"
                maxLength={100}
                value={formulario.registro_sanitario ?? ''}
                onChange={(e) =>
                  actualizarCampo('registro_sanitario', e.target.value)
                }
                placeholder="Número de registro sanitario"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="stock_minimo"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Stock mínimo
              </label>
              <input
                id="stock_minimo"
                type="number"
                min="0"
                step="1"
                value={formulario.stock_minimo ?? 0}
                onChange={(e) =>
                  actualizarCampo('stock_minimo', Number(e.target.value))
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="unidad_medida"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Unidad de medida
              </label>
              <select
                id="unidad_medida"
                value={formulario.unidad_medida}
                onChange={(e) =>
                  actualizarCampo('unidad_medida', e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="unidad">Unidad</option>
                <option value="caja">Caja</option>
                <option value="frasco">Frasco</option>
                <option value="blister">Blíster</option>
                <option value="sobre">Sobre</option>
                <option value="tubo">Tubo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="descripcion"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id="descripcion"
                rows={4}
                value={formulario.descripcion ?? ''}
                onChange={(e) =>
                  actualizarCampo('descripcion', e.target.value)
                }
                placeholder="Información adicional del medicamento"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Los campos marcados con * son obligatorios.
          </p>

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => navigate('/inventario')}
              className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={19} />
              {guardando ? 'Guardando...' : 'Guardar medicamento'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default RegistrarMedicamentoPage
