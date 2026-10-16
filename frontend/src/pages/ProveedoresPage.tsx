import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Plus, RefreshCw, Truck } from 'lucide-react'

import {
  actualizarProveedor,
  crearProveedor,
  getProveedores,
  type NuevoProveedor,
  type Proveedor,
} from '../services/inventarioService'

const proveedorVacio: NuevoProveedor = {
  nombre: '',
  contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  activo: true,
}

function obtenerError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined
    if (data) {
      return Object.entries(data)
        .map(([campo, detalle]) => `${campo}: ${Array.isArray(detalle) ? detalle.join(', ') : String(detalle)}`)
        .join(' · ')
    }
  }
  return 'No se pudo completar la operación.'
}

function ProveedoresPage() {
  const navigate = useNavigate()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [formulario, setFormulario] = useState<NuevoProveedor>(proveedorVacio)
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargarProveedores() {
    setError('')
    try {
      setProveedores(await getProveedores())
    } catch (err) {
      setError(obtenerError(err))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let montado = true
    getProveedores()
      .then((lista) => {
        if (montado) setProveedores(lista)
      })
      .catch((err: unknown) => {
        if (montado) setError(obtenerError(err))
      })
      .finally(() => {
        if (montado) setCargando(false)
      })
    return () => {
      montado = false
    }
  }, [])

  function editar(proveedor: Proveedor) {
    setProveedorEditando(proveedor)
    setFormulario({
      nombre: proveedor.nombre,
      contacto: proveedor.contacto,
      telefono: proveedor.telefono,
      email: proveedor.email,
      direccion: proveedor.direccion,
      activo: proveedor.activo,
    })
    setModalAbierto(true)
    setError('')
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      if (proveedorEditando) {
        await actualizarProveedor(proveedorEditando.id, {
          ...formulario,
          nombre: formulario.nombre.trim(),
        })
        setMensaje('Proveedor actualizado.')
      } else {
        await crearProveedor({
          ...formulario,
          nombre: formulario.nombre.trim(),
        })
        setMensaje('Proveedor registrado.')
      }
      setModalAbierto(false)
      await cargarProveedores()
    } catch (err) {
      setError(obtenerError(err))
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstado(proveedor: Proveedor) {
    try {
      const actualizado = await actualizarProveedor(proveedor.id, {
        activo: !proveedor.activo,
      })
      setProveedores((lista) =>
        lista.map((item) => item.id === proveedor.id ? actualizado : item),
      )
      setMensaje(actualizado.activo ? 'Proveedor activado.' : 'Proveedor desactivado.')
      setError('')
    } catch (err) {
      setError(obtenerError(err))
    }
  }

  return (
    <main className="bg-app-bg">
      <header className="border-b border-app-border bg-app-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/inventario')} aria-label="Volver al inventario" className="rounded-lg p-2 text-app-muted hover:bg-app-bg">
              <ArrowLeft size={21} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-app-text">Proveedores</h1>
              <p className="text-sm text-app-muted">Directorio asociado a lotes de inventario</p>
            </div>
          </div>
          <button type="button" onClick={() => { setProveedorEditando(null); setFormulario(proveedorVacio); setModalAbierto(true); setError('') }} className="inline-flex items-center gap-2 rounded-lg bg-[#003F63] px-4 py-2.5 font-semibold text-white hover:bg-[#00507d]">
            <Plus size={18} /> Nuevo proveedor
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-app-text">Directorio</h2>
            <p className="mt-1 text-sm text-app-muted">Los proveedores se asocian a lotes; no se gestionan compras en este módulo.</p>
          </div>
          <button type="button" onClick={() => void cargarProveedores()} aria-label="Actualizar proveedores" title="Actualizar" className="rounded-lg border border-app-border bg-app-card p-2.5 text-app-text hover:bg-app-bg">
            <RefreshCw size={18} />
          </button>
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}
        <section className="overflow-hidden rounded-xl border border-app-border bg-app-card">
          {cargando ? <p className="p-8 text-center text-app-muted">Cargando proveedores...</p> : proveedores.length === 0 ? <p className="p-8 text-center text-app-muted">No hay proveedores registrados.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-app-bg text-app-muted"><tr><th className="px-5 py-3">Proveedor</th><th className="px-5 py-3">Contacto</th><th className="px-5 py-3">Teléfono / correo</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-app-border">
                  {proveedores.map((proveedor) => (
                    <tr key={proveedor.id}>
                      <td className="px-5 py-4 font-semibold text-app-text">{proveedor.nombre}<p className="mt-1 text-xs font-normal text-app-muted">{proveedor.direccion}</p></td>
                      <td className="px-5 py-4">{proveedor.contacto || '—'}</td>
                      <td className="px-5 py-4">{proveedor.telefono || '—'}<p className="mt-1 text-xs text-app-muted">{proveedor.email}</p></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${proveedor.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-app-border text-app-text'}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => editar(proveedor)} className="rounded-lg border border-app-border px-3 py-2 font-medium text-app-text hover:bg-app-bg">Editar</button><button type="button" onClick={() => void cambiarEstado(proveedor)} className="rounded-lg border border-app-border px-3 py-2 font-medium text-app-text hover:bg-app-bg">{proveedor.activo ? 'Desactivar' : 'Activar'}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {modalAbierto && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="proveedor-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-app-card p-6 shadow-xl">
            <div className="mb-5 flex items-center gap-3"><Truck className="text-app-text" /><div><h2 id="proveedor-title" className="text-xl font-bold text-app-text">{proveedorEditando ? 'Editar proveedor' : 'Nuevo proveedor'}</h2><p className="text-sm text-app-muted">Datos de contacto y referencia de abastecimiento.</p></div></div>
            <form onSubmit={(evento) => void guardar(evento)} className="space-y-4">
              <label className="block text-sm font-medium text-app-text">Nombre<input required maxLength={150} value={formulario.nombre} onChange={(evento) => setFormulario((actual) => ({ ...actual, nombre: evento.target.value }))} className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-app-text">Contacto<input value={formulario.contacto} onChange={(evento) => setFormulario((actual) => ({ ...actual, contacto: evento.target.value }))} className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5" /></label>
                <label className="text-sm font-medium text-app-text">Teléfono<input value={formulario.telefono} onChange={(evento) => setFormulario((actual) => ({ ...actual, telefono: evento.target.value }))} className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5" /></label>
                <label className="text-sm font-medium text-app-text sm:col-span-2">Correo<input type="email" value={formulario.email} onChange={(evento) => setFormulario((actual) => ({ ...actual, email: evento.target.value }))} className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5" /></label>
                <label className="text-sm font-medium text-app-text sm:col-span-2">Dirección<textarea rows={2} value={formulario.direccion} onChange={(evento) => setFormulario((actual) => ({ ...actual, direccion: evento.target.value }))} className="mt-1.5 w-full rounded-lg border border-app-border px-3 py-2.5" /></label>
              </div>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-app-border pt-4"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-app-border px-4 py-2.5 font-medium text-app-text">Cancelar</button><button type="submit" disabled={guardando} className="rounded-lg bg-[#003F63] px-4 py-2.5 font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar proveedor'}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default ProveedoresPage