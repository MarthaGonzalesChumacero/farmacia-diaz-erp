from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import RegistroAuditoriaUsuario


Usuario = get_user_model()


class UsuarioAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.administrador = Usuario.objects.create_user(
            username='admin-api',
            password='AdminPass123!',
            rol=Usuario.Rol.ADMINISTRADOR,
            is_staff=False,
        )
        self.auxiliar = Usuario.objects.create_user(
            username='auxiliar-api',
            password='AuxPass123!',
            rol=Usuario.Rol.AUXILIAR,
        )

    def autenticar_como(self, usuario):
        self.client.force_authenticate(user=usuario)

    def datos_usuario(self, **cambios):
        datos = {
            'username': 'nuevo-usuario',
            'password': 'ClaveInicial123!',
            'first_name': 'Nuevo',
            'last_name': 'Usuario',
            'email': 'nuevo@example.test',
            'rol': Usuario.Rol.AUXILIAR,
            'telefono': '70000000',
            'activo': True,
        }
        datos.update(cambios)
        return datos

    def test_jwt_login_y_endpoint_me(self):
        respuesta_token = self.client.post(
            '/api/token/',
            {
                'username': 'admin-api',
                'password': 'AdminPass123!',
            },
            format='json',
        )

        self.assertEqual(respuesta_token.status_code, status.HTTP_200_OK)
        self.assertIn('access', respuesta_token.data)
        self.assertIn('refresh', respuesta_token.data)

        cliente_autenticado = APIClient()
        cliente_autenticado.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {respuesta_token.data['access']}"
            )
        )
        respuesta_me = cliente_autenticado.get('/usuarios/me/')

        self.assertEqual(respuesta_me.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta_me.data['username'], 'admin-api')
        self.assertEqual(
            respuesta_me.data['rol'],
            Usuario.Rol.ADMINISTRADOR,
        )

    def test_usuario_desactivado_no_obtiene_jwt(self):
        self.auxiliar.activo = False
        self.auxiliar.save(update_fields=['activo'])

        respuesta = self.client.post(
            '/api/token/',
            {
                'username': 'auxiliar-api',
                'password': 'AuxPass123!',
            },
            format='json',
        )

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', respuesta.data)

    def test_sin_autenticacion_no_consulta_usuarios(self):
        objetivo = Usuario.objects.create_user(
            username='objetivo-anonimo',
            password='ObjetivoPass123!',
            rol=Usuario.Rol.AUXILIAR,
        )

        listar = self.client.get('/usuarios/')
        crear = self.client.post(
            '/usuarios/',
            self.datos_usuario(username='anonimo-creacion'),
            format='json',
        )
        editar = self.client.patch(
            f'/usuarios/{objetivo.id}/',
            {'first_name': 'No autorizado'},
            format='json',
        )

        self.assertEqual(listar.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(crear.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(editar.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Usuario.objects.count(), 3)
        objetivo.refresh_from_db()
        self.assertEqual(objetivo.first_name, '')

    def test_rol_administrador_gestiona_sin_is_staff(self):
        self.assertFalse(self.administrador.is_staff)
        self.autenticar_como(self.administrador)

        respuesta = self.client.get('/usuarios/')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data), 2)

    def test_auxiliar_no_puede_listar_crear_ni_editar(self):
        self.autenticar_como(self.auxiliar)

        listar = self.client.get('/usuarios/')
        crear = self.client.post(
            '/usuarios/',
            self.datos_usuario(),
            format='json',
        )
        editar = self.client.patch(
            f'/usuarios/{self.administrador.id}/',
            {'first_name': 'No autorizado'},
            format='json',
        )

        self.assertEqual(listar.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(crear.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(editar.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Usuario.objects.count(), 2)

    def test_auxiliar_no_puede_activar_ni_desactivar(self):
        usuario_activo = Usuario.objects.create_user(
            username='objetivo-activo',
            password='ObjetivoPass123!',
            rol=Usuario.Rol.AUXILIAR,
            activo=True,
            is_active=True,
        )
        usuario_inactivo = Usuario.objects.create_user(
            username='objetivo-inactivo',
            password='ObjetivoPass123!',
            rol=Usuario.Rol.AUXILIAR,
            activo=False,
            is_active=False,
        )
        self.autenticar_como(self.auxiliar)

        desactivar = self.client.patch(
            f'/usuarios/{usuario_activo.id}/',
            {'activo': False},
            format='json',
        )
        activar = self.client.patch(
            f'/usuarios/{usuario_inactivo.id}/',
            {'activo': True},
            format='json',
        )

        self.assertEqual(desactivar.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(activar.status_code, status.HTTP_403_FORBIDDEN)
        usuario_activo.refresh_from_db()
        usuario_inactivo.refresh_from_db()
        self.assertTrue(usuario_activo.activo)
        self.assertTrue(usuario_activo.is_active)
        self.assertFalse(usuario_inactivo.activo)
        self.assertFalse(usuario_inactivo.is_active)

    def test_administrador_crea_usuario_con_password_cifrada(self):
        self.autenticar_como(self.administrador)

        respuesta = self.client.post(
            '/usuarios/',
            self.datos_usuario(rol=Usuario.Rol.ADMINISTRADOR),
            format='json',
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', respuesta.data)
        usuario = Usuario.objects.get(username='nuevo-usuario')
        self.assertTrue(usuario.check_password('ClaveInicial123!'))
        self.assertNotEqual(usuario.password, 'ClaveInicial123!')
        self.assertEqual(usuario.rol, Usuario.Rol.ADMINISTRADOR)
        self.assertFalse(usuario.is_staff)
        evento = RegistroAuditoriaUsuario.objects.get(
            usuario_id=usuario.id,
            accion='crear',
        )
        self.assertEqual(evento.actor_id, self.administrador.id)
        self.assertNotIn('password', evento.cambios)

    def test_edicion_conserva_password_y_rechaza_restablecerlo(self):
        self.autenticar_como(self.administrador)
        usuario = Usuario.objects.create_user(
            username='editar-usuario',
            password='OriginalPass123!',
            rol=Usuario.Rol.AUXILIAR,
        )

        actualizar = self.client.patch(
            f'/usuarios/{usuario.id}/',
            {'first_name': 'Nombre actualizado'},
            format='json',
        )
        usuario.refresh_from_db()

        self.assertEqual(actualizar.status_code, status.HTTP_200_OK)
        self.assertEqual(usuario.first_name, 'Nombre actualizado')
        self.assertTrue(usuario.check_password('OriginalPass123!'))

        restablecer = self.client.patch(
            f'/usuarios/{usuario.id}/',
            {'password': 'NuevaClave123!'},
            format='json',
        )
        usuario.refresh_from_db()

        self.assertEqual(
            restablecer.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertTrue(usuario.check_password('OriginalPass123!'))

    def test_activar_desactivar_y_prevenir_autobloqueo(self):
        self.autenticar_como(self.administrador)
        usuario = Usuario.objects.create_user(
            username='estado-usuario',
            password='EstadoPass123!',
            rol=Usuario.Rol.AUXILIAR,
        )

        desactivar = self.client.patch(
            f'/usuarios/{usuario.id}/',
            {'activo': False},
            format='json',
        )
        usuario.refresh_from_db()
        self.assertEqual(desactivar.status_code, status.HTTP_200_OK)
        self.assertFalse(usuario.activo)
        self.assertFalse(usuario.is_active)

        activar = self.client.patch(
            f'/usuarios/{usuario.id}/',
            {'activo': True},
            format='json',
        )
        usuario.refresh_from_db()
        self.assertEqual(activar.status_code, status.HTTP_200_OK)
        self.assertTrue(usuario.activo)
        self.assertTrue(usuario.is_active)
        self.assertTrue(
            RegistroAuditoriaUsuario.objects.filter(
                usuario_id=usuario.id,
                accion='desactivar',
            ).exists()
        )

        autobloqueo = self.client.patch(
            f'/usuarios/{self.administrador.id}/',
            {'activo': False},
            format='json',
        )
        self.administrador.refresh_from_db()
        self.assertEqual(
            autobloqueo.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertTrue(self.administrador.activo)

    def test_api_no_permite_eliminar_usuarios(self):
        self.autenticar_como(self.administrador)

        respuesta = self.client.delete(
            f'/usuarios/{self.auxiliar.id}/'
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(
            Usuario.objects.filter(pk=self.auxiliar.pk).exists()
        )

    def test_auditoria_usuarios_solo_admin_puede_consultar(self):
        evento = RegistroAuditoriaUsuario.objects.create(
            actor_id=self.administrador.id,
            actor_username=self.administrador.username,
            accion='cambiar_rol',
            usuario_id=self.auxiliar.id,
            usuario_username=self.auxiliar.username,
            cambios={'rol': {'antes': 'auxiliar', 'despues': 'administrador'}},
        )

        anonimo = self.client.get('/auditoria/')
        self.assertEqual(anonimo.status_code, status.HTTP_401_UNAUTHORIZED)

        self.autenticar_como(self.auxiliar)
        auxiliar = self.client.get('/auditoria/')
        self.assertEqual(auxiliar.status_code, status.HTTP_403_FORBIDDEN)

        self.autenticar_como(self.administrador)
        administrador = self.client.get('/auditoria/')
        borrar = self.client.delete(f'/auditoria/{evento.id}/')
        self.assertEqual(administrador.status_code, status.HTTP_200_OK)
        self.assertEqual(len(administrador.data), 1)
        self.assertEqual(
            borrar.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(
            RegistroAuditoriaUsuario.objects.filter(pk=evento.pk).exists()
        )