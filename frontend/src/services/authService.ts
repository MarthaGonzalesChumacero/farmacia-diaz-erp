
import usuariosApi from '../api/usuariosApi'

// ======================================
// Tipos de autenticación
// ======================================

export interface LoginCredentials {
  username: string
  password: string
}

export interface TokenResponse {
  access: string
  refresh: string
}

export interface UsuarioActual {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  rol: 'administrador' | 'auxiliar'
  telefono: string
  activo: boolean
}

export type RolUsuario = UsuarioActual['rol']

export interface NuevoUsuario {
  username: string
  password: string
  first_name: string
  last_name: string
  email: string
  rol: RolUsuario
  telefono: string
  activo: boolean
}

export type ActualizacionUsuario = Partial<
  Omit<NuevoUsuario, 'password'>
>

export interface EventoAuditoriaUsuario {
  id: number
  actor_id: number
  actor_username: string
  accion: string
  usuario_id: number
  usuario_username: string
  cambios: Record<string, unknown>
  fecha_evento: string
}

// ======================================
// Iniciar sesión
// ======================================

export async function login(
  credentials: LoginCredentials,
): Promise<TokenResponse> {
  const response = await usuariosApi.post<TokenResponse>(
    '/api/token/',
    credentials,
  )

  return response.data
}

// ======================================
// Obtener token de acceso
// ======================================

function getAccessToken(): string {
  const accessToken = localStorage.getItem('accessToken')

  if (!accessToken) {
    throw new Error('No existe un token de acceso.')
  }

  return accessToken
}

// ======================================
// Obtener usuario autenticado
// ======================================

export async function getUsuarioActual(): Promise<UsuarioActual> {
  const accessToken = getAccessToken()

  const response = await usuariosApi.get<UsuarioActual>(
    '/usuarios/me/',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  return response.data
}

// ======================================
// Obtener lista de usuarios
// ======================================

export async function getUsuarios(): Promise<UsuarioActual[]> {
  const accessToken = getAccessToken()

  const response = await usuariosApi.get<UsuarioActual[]>(
    '/usuarios/',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  return response.data
}

export async function crearUsuario(
  usuario: NuevoUsuario,
): Promise<UsuarioActual> {
  const accessToken = getAccessToken()
  const response = await usuariosApi.post<UsuarioActual>(
    '/usuarios/',
    usuario,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )
  return response.data
}

export async function actualizarUsuario(
  id: number,
  cambios: ActualizacionUsuario,
): Promise<UsuarioActual> {
  const accessToken = getAccessToken()
  const response = await usuariosApi.patch<UsuarioActual>(
    `/usuarios/${id}/`,
    cambios,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )
  return response.data
}

export async function getAuditoriaUsuarios(): Promise<EventoAuditoriaUsuario[]> {
  const accessToken = getAccessToken()
  const response = await usuariosApi.get<EventoAuditoriaUsuario[]>(
    '/auditoria/',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )
  return response.data
}
