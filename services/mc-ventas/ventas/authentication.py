import json
import os
from types import SimpleNamespace
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from rest_framework import authentication, exceptions, permissions


class UsuarioERP(SimpleNamespace):
    @property
    def is_authenticated(self):
        return True


class UsuarioERPAuthentication(authentication.BaseAuthentication):
    """
    Autenticación mediante token JWT Bearer validado contra el microservicio mc-usuarios.
    Permite también usuarios previamente autenticados (e.g. en tests con force_authenticate).
    """

    def authenticate(self, request):
        # Si se usó force_authenticate en tests de DRF
        force_user = getattr(request, '_force_auth_user', None)
        if force_user is not None:
            return (force_user, getattr(request, '_force_auth_token', None))

        usuario_existente = getattr(request, '_user', None)
        if usuario_existente and getattr(usuario_existente, 'is_authenticated', False):
            return (usuario_existente, None)

        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return None

        partes = auth_header.split()
        if len(partes) != 2 or partes[0].lower() != 'bearer':
            raise exceptions.AuthenticationFailed(
                'Formato de autorización inválido. Debe ser Bearer <token>.'
            )

        token = partes[1]
        base_url = os.getenv(
            'USUARIOS_API_URL',
            'http://mc-usuarios:8000',
        ).rstrip('/')

        consulta = Request(
            f'{base_url}/usuarios/me/',
            headers={'Authorization': f'Bearer {token}'},
        )

        try:
            with urlopen(consulta, timeout=3) as respuesta:
                if respuesta.status != 200:
                    raise exceptions.AuthenticationFailed(
                        'Token inválido o expirado.'
                    )
                datos = json.loads(respuesta.read().decode('utf-8'))
        except HTTPError as error:
            if error.code in (401, 403):
                raise exceptions.AuthenticationFailed(
                    'Token inválido o expirado.'
                )
            raise exceptions.AuthenticationFailed(
                f'Error al validar autenticación con el servicio de usuarios: {error.code}.'
            )
        except (URLError, TimeoutError):
            raise exceptions.AuthenticationFailed(
                'No se pudo conectar con el servicio de autenticación de usuarios.'
            )
        except (ValueError, KeyError, TypeError):
            raise exceptions.AuthenticationFailed(
                'Respuesta inválida del servicio de autenticación.'
            )

        if not datos.get('activo', False):
            raise exceptions.PermissionDenied(
                'El usuario se encuentra inactivo.'
            )

        rol = datos.get('rol')
        if rol not in ('administrador', 'auxiliar'):
            raise exceptions.PermissionDenied(
                'El rol del usuario no tiene permisos para acceder a ventas.'
            )

        usuario = UsuarioERP(
            pk=datos.get('id'),
            id=datos.get('id'),
            username=datos.get('username'),
            rol=rol,
            activo=datos.get('activo', True),
            get_username=lambda: datos.get('username', ''),
        )

        return (usuario, token)

    def authenticate_header(self, request):
        return 'Bearer realm="api-ventas"'


class UsuarioERPActivo(permissions.BasePermission):
    """
    Permiso que valida que el usuario esté autenticado, activo
    y pertenezca a los roles autorizados ('administrador' o 'auxiliar').
    """
    message = 'Se requiere autenticación de Administrador o Auxiliar activo.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False

        activo = getattr(user, 'activo', True)
        rol = getattr(user, 'rol', None)

        return bool(activo and rol in ('administrador', 'auxiliar'))
