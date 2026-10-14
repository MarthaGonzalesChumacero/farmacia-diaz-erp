import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Save } from 'lucide-react'

import {
  actualizarMedicamento,
  getMedicamentos,
  type Medicamento,
} from '../services/inventarioService'

function EditarMedicamentoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [medicamento, setMedicamento] = useState<Medicamento | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    let montado = true
    getMedicamentos()
      .then((lista) => {
        const encontrado = lista.find((item) => item.id === Number(id))
        if (montado) {
          if (encontrado) setMedicamento(encontrado)
          else setError('No se encontró el medicamento.')
        }
      })
      .catch(() => {
        if (montado) setError('No se pudo cargar el medicamento.')
      })
    return () => { montado = false }
  }, [id])

  function cambiar(campo: keyof Medicamento, valor: string | number) {
    setMedicamento((actual) => actual ? { ...actual, [campo]: valor } : actual)
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!medicamento || guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const actualizado = await actualizarMedicamento(medicamento.id, {
        nombre: medicamento.nombre.trim(),
        principio_activo: medicamento.principio_activo.trim(),
        presentacion: medicamento.presentacion.trim(),
        codigo_barras: medicamento.codigo_barras.trim(),
        registro_sanitario: medicamento.registro_sanitario,
        descripcion: medicamento.descripcion,
        stock_minimo: Number(medicamento.stock_minimo),
        unidad_medida: medicamento.unidad_medida,
        categoria: medicamento.categoria || null,
        laboratorio: medicamento.laboratorio || null,
      })
      setMedicamento(actualizado)
      setMensaje('Medicamento actualizado.')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        setError(JSON.stringify(err.response.data))
      } else {
        setError('No se pudo actualizar el medicamento.')
      }
    } finally {
      setGuardando(false)
    }
  }

  const claseCampo = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5'

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5"><button type="button" onClick={() => navigate('/inventario')} aria-label="Volver al inventario" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} /></button><div><h1 className="text-xl font-bold text-slate-900">Editar medicamento</h1><p className="text-sm text-slate-500">Los cambios no alteran existencias ni movimientos.</p></div></div></header>
      <section className="mx-auto max-w-5xl px-6 py-8">
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}
        {!medicamento ? <p className="rounded-xl bg-white p-8 text-center text-slate-500">Cargando medicamento...</p> : (
          <form onSubmit={(evento) => void guardar(evento)} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Nombre<input required value={medicamento.nombre} onChange={(evento) => cambiar('nombre', evento.target.value)} className={claseCampo} /></label>
            <label className="text-sm font-medium text-slate-700">Principio activo<input required value={medicamento.principio_activo} onChange={(evento) => cambiar('principio_activo', evento.target.value)} className={claseCampo} /></label>
            <label className="text-sm font-medium text-slate-700">Presentación<input required value={medicamento.presentacion} onChange={(evento) => cambiar('presentacion', evento.target.value)} className={claseCampo} /></label>
            <label className="text-sm font-medium text-slate-700">Código de barras<input required value={medicamento.codigo_barras} onChange={(evento) => cambiar('codigo_barras', evento.target.value)} className={claseCampo} /></label>
            <label className="text-sm font-medium text-slate-700">Registro sanitario<input value={medicamento.registro_sanitario ?? ''} onChange={(evento) => cambiar('registro_sanitario', evento.target.value)} className={claseCampo} /></label>
            <label className="text-sm font-medium text-slate-700">Stock mínimo<input type="number" min="0" step="1" value={medicamento.stock_minimo} onChange={(evento) => cambiar('stock_minimo', Number(evento.target.value))} className={claseCampo} /></label>
            <label className="text-sm font-medium text-slate-700">Unidad de medida<select value={medicamento.unidad_medida} onChange={(evento) => cambiar('unidad_medida', evento.target.value)} className={claseCampo}><option value="unidad">Unidad</option><option value="caja">Caja</option><option value="frasco">Frasco</option><option value="blister">Blíster</option><option value="sobre">Sobre</option><option value="tubo">Tubo</option></select></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Descripción<textarea rows={3} value={medicamento.descripcion} onChange={(evento) => cambiar('descripcion', evento.target.value)} className={claseCampo} /></label>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" onClick={() => navigate('/inventario')} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700">Volver</button><button type="submit" disabled={guardando} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"><Save size={17} />{guardando ? 'Guardando...' : 'Guardar cambios'}</button></div>
          </form>
        )}
      </section>
    </main>
  )
}

export default EditarMedicamentoPage