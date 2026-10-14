import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Check, Plus, RefreshCw, Search, UserRoundCog } from 'lucide-react'

import {
  actualizarUsuario,
  crearUsuario,
  getUsuarioActual,
  getUsuarios,
  type UsuarioActual,
} from '../services/authService'

interface FormularioUsuario {
  username: string
  password: string
  first_name: string
  last_name: string
  email: string
  rol: UsuarioActual['rol']
  telefono: string
}

const formularioInicial: FormularioUsuario = {
  username: '',
  password: '',
  first_name: '',
  last_name: '',
  email: '',
  rol: 'auxiliar',
  telefono: '',
}

function mensajeError(error: unknown): string {
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

function UsuariosPage() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<UsuarioActual[]>([])
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual | null>(null)
  const [formulario, setFormulario] = useState<FormularioUsuario>(formularioInicial)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioActual | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [usuarioActualizando, setUsuarioActualizando] = useState<number | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    let montado = true
    Promise.all([getUsuarioActual(), getUsuarios()])
      .then(([actual, lista]) => {
        if (!montado) return
        setUsuarioActual(actual)
        setUsuarios(lista)
      })
      .catch((err: unknown) => {
        if (montado) setError(mensajeError(err))
      })
      .finally(() => {
        if (montado) setCargando(false)
      })

    return () => {
      montado = false
    }
  }, [])

  async function cargarUsuarios() {
    setError('')
    try {
      const lista = await getUsuarios()
      setUsuarios(lista)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  function abrirAlta() {
    setUsuarioEditando(null)
    setFormulario(formularioInicial)
    setModalAbierto(true)
    setError('')
    setMensaje('')
  }

  function abrirEdicion(usuario: UsuarioActual) {
    setUsuarioEditando(usuario)
    setFormulario({
      username: usuario.username,
      password: '',
      first_name: usuario.first_name,
      last_name: usuario.last_name,
      email: usuario.email,
      rol: usuario.rol,
      telefono: usuario.telefono,
    })
    setModalAbierto(true)
    setError('')
    setMensaje('')
  }

  async function guardarUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      if (usuarioEditando) {
        await actualizarUsuario(usuarioEditando.id, {
          username: formulario.username.trim(),
          first_name: formulario.first_name.trim(),
          last_name: formulario.last_name.trim(),
          email: formulario.email.trim(),
          rol: formulario.rol,
          telefono: formulario.telefono.trim(),
        })
        setMensaje('Usuario actualizado.')
      } else {
        await crearUsuario({
          username: formulario.username.trim(),
          password: formulario.password,
          first_name: formulario.first_name.trim(),
          last_name: formulario.last_name.trim(),
          email: formulario.email.trim(),
          rol: formulario.rol,
          telefono: formulario.telefono.trim(),
          activo: true,
        })
        setMensaje('Usuario registrado.')
      }

      setModalAbierto(false)
      await cargarUsuarios()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstado(usuario: UsuarioActual) {
    setUsuarioActualizando(usuario.id)
    setError('')
    setMensaje('')
    try {
      const actualizado = await actualizarUsuario(usuario.id, {
        activo: !usuario.activo,
      })
      setUsuarios((lista) =>
        lista.map((item) => item.id === usuario.id ? actualizado : item),
      )
      setMensaje(actualizado.activo ? 'Usuario activado.' : 'Usuario desactivado.')
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setUsuarioActualizando(null)
    }
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busqueda.trim().toLowerCase()
    const coincideTexto = [
      usuario.username,
      usuario.first_name,
      usuario.last_name,
      usuario.email,
    ].some((valor) => valor.toLowerCase().includes(texto))
    const coincideEstado =
      filtro === 'todos' ||
      (filtro === 'activos' && usuario.activo) ||
      (filtro === 'inactivos' && !usuario.activo)
    return coincideTexto && coincideEstado
  })

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              aria-label="Volver al panel"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft size={21} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Administración de usuarios</h1>
              <p className="text-sm text-slate-500">Cuentas, roles y acceso al ERP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirAlta}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-800 px-4 py-2.5 font-semibold text-white hover:bg-violet-900"
          >
            <Plus size={18} />
            Nuevo usuario
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Usuarios registrados</h2>
            <p className="mt-1 text-sm text-slate-500">
              {usuarios.length} cuentas · Administradores y auxiliares
            </p>
          </div>
          <button
            type="button"
            onClick={() => void cargarUsuarios()}
            title="Actualizar usuarios"
            aria-label="Actualizar usuarios"
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {mensaje && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
            <label className="relative min-w-64 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar usuario, nombre o correo"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
              />
            </label>
            <div className="flex gap-1" aria-label="Filtrar por estado">
              {(['todos', 'activos', 'inactivos'] as const).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  aria-pressed={filtro === opcion}
                  onClick={() => setFiltro(opcion)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${filtro === opcion ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>

          {cargando ? (
            <p className="p-8 text-center text-slate-500">Cargando usuarios...</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No se encontraron usuarios.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Usuario</th>
                    <th className="px-5 py-3 font-semibold">Nombre / correo</th>
                    <th className="px-5 py-3 font-semibold">Rol</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id}>
                      <td className="px-5 py-4 font-semibold text-slate-900">{usuario.username}</td>
                      <td className="px-5 py-4">
                        <p className="text-slate-800">{`${usuario.first_name} ${usuario.last_name}`.trim() || 'Sin nombre'}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{usuario.email || 'Sin correo'}</p>
                      </td>
                      <td className="px-5 py-4">
                        {usuario.rol === 'administrador' ? 'Administrador' : 'Auxiliar'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${usuario.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEdicion(usuario)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void cambiarEstado(usuario)}
                            disabled={
                              usuarioActualizando === usuario.id ||
                              usuarioActual?.id === usuario.id
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {usuario.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
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
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="usuario-dialog-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
                <UserRoundCog size={21} />
              </div>
              <div>
                <h2 id="usuario-dialog-title" className="text-xl font-bold text-slate-900">
                  {usuarioEditando ? 'Editar usuario' : 'Registrar usuario'}
                </h2>
                <p className="text-sm text-slate-500">
                  {usuarioEditando ? 'La contraseña existente no se modifica.' : 'Define la contraseña inicial y el rol.'}
                </p>
              </div>
            </div>

            <form onSubmit={(evento) => void guardarUsuario(evento)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Nombre de usuario
                  <input
                    required
                    minLength={3}
                    maxLength={150}
                    value={formulario.username}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, username: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </label>
                {!usuarioEditando && (
                  <label className="text-sm font-medium text-slate-700">
                    Contraseña inicial
                    <input
                      required
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={formulario.password}
                      onChange={(evento) => setFormulario((actual) => ({ ...actual, password: evento.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </label>
                )}
                <label className="text-sm font-medium text-slate-700">
                  Nombre
                  <input
                    value={formulario.first_name}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, first_name: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Apellido
                  <input
                    value={formulario.last_name}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, last_name: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Correo
                  <input
                    type="email"
                    value={formulario.email}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, email: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Teléfono
                  <input
                    value={formulario.telefono}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, telefono: evento.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Rol
                  <select
                    value={formulario.rol}
                    disabled={usuarioEditando?.id === usuarioActual?.id}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, rol: evento.target.value as UsuarioActual['rol'] }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:bg-slate-100"
                  >
                    <option value="administrador">Administrador</option>
                    <option value="auxiliar">Auxiliar</option>
                  </select>
                </label>
              </div>

              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-800 px-4 py-2.5 font-semibold text-white hover:bg-violet-900 disabled:opacity-50"
                >
                  {usuarioEditando ? <Check size={17} /> : <Plus size={17} />}
                  {guardando ? 'Guardando...' : usuarioEditando ? 'Guardar cambios' : 'Registrar usuario'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default UsuariosPage