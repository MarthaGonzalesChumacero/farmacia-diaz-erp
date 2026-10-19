from decimal import Decimal

from django.test import SimpleTestCase, TestCase
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import Mock, patch

from .authentication import UsuarioERP
from .models import Venta
from .clients.inventario_client import (
    InventarioClient,
    InventarioNoDisponible,
    StockInsuficiente,
)


def usuario_erp(pk=100, username="admin-prueba", rol="administrador", activo=True):
    return UsuarioERP(
        pk=pk,
        id=pk,
        username=username,
        rol=rol,
        activo=activo,
        get_username=lambda: username,
    )


class VentaAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=usuario_erp())
        self.url = '/ventas/'

    @patch('ventas.services.venta_service.InventarioClient.registrar_venta')
    def test_crear_venta_correctamente(self, registrar_venta):
        datos = {
            'referencia': 'TEST-V001',
            'estado': 'pendiente',
            'observacion': 'Venta de prueba automática',
            'detalles': [
                {
                    'medicamento_id': 1,
                    'medicamento_nombre': 'Paracetamol',
                    'cantidad': 2,
                    'precio_unitario': '12.50',
                }
            ],
        }

        response = self.client.post(
            self.url,
            datos,
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            Venta.objects.count(),
            1,
        )

        venta = Venta.objects.first()

        self.assertEqual(
            venta.referencia,
            'TEST-V001',
        )

        self.assertEqual(
            venta.total,
            Decimal('25.00'),
        )
        self.assertEqual(venta.estado, 'completada')
        registrar_venta.assert_called_once_with(
            referencia='TEST-V001',
            detalles=[{'medicamento_id': 1, 'cantidad': 2}],
        )

    @patch('ventas.services.venta_service.InventarioClient.registrar_venta')
    def test_calcular_total_con_varios_detalles(self, registrar_venta):
        datos = {
            'referencia': 'TEST-V002',
            'estado': 'pendiente',
            'observacion': 'Venta con varios medicamentos',
            'detalles': [
                {
                    'medicamento_id': 1,
                    'medicamento_nombre': 'Paracetamol',
                    'cantidad': 2,
                    'precio_unitario': '10.00',
                },
                {
                    'medicamento_id': 2,
                    'medicamento_nombre': 'Ibuprofeno',
                    'cantidad': 3,
                    'precio_unitario': '5.00',
                },
            ],
        }

        response = self.client.post(
            self.url,
            datos,
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        venta = Venta.objects.get(
            referencia='TEST-V002'
        )

        self.assertEqual(
            venta.total,
            Decimal('35.00'),
        )

        self.assertEqual(
            venta.detalles.count(),
            2,
        )
        registrar_venta.assert_called_once_with(
            referencia='TEST-V002',
            detalles=[
                {'medicamento_id': 1, 'cantidad': 2},
                {'medicamento_id': 2, 'cantidad': 3},
            ],
        )

    @patch('ventas.services.venta_service.InventarioClient.registrar_venta')
    def test_reenvia_jwt_a_inventario_para_auditoria(self, registrar_venta):
        self.client.credentials(
            HTTP_AUTHORIZATION='Bearer token-auditoria'
        )
        response = self.client.post(
            self.url,
            {
                'referencia': 'TEST-ACTOR-INVENTARIO',
                'observacion': '',
                'detalles': [
                    {
                        'medicamento_id': 1,
                        'medicamento_nombre': 'Paracetamol',
                        'cantidad': 1,
                        'precio_unitario': '5.00',
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registrar_venta.assert_called_once_with(
            referencia='TEST-ACTOR-INVENTARIO',
            detalles=[{'medicamento_id': 1, 'cantidad': 1}],
            authorization='Bearer token-auditoria',
        )

    @patch('ventas.services.venta_service.InventarioClient.registrar_venta')
    def test_reintentar_venta_completada_no_repite_descuento(
        self,
        registrar_venta,
    ):
        datos = {
            'referencia': 'TEST-IDEMPOTENTE',
            'observacion': '',
            'detalles': [
                {
                    'medicamento_id': 1,
                    'medicamento_nombre': 'Paracetamol',
                    'cantidad': 2,
                    'precio_unitario': '12.50',
                }
            ],
        }

        primera = self.client.post(self.url, datos, format='json')
        segunda = self.client.post(self.url, datos, format='json')

        self.assertEqual(primera.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segunda.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Venta.objects.count(), 1)
        registrar_venta.assert_called_once()

    @patch('ventas.services.venta_service.InventarioClient.registrar_venta')
    def test_fallo_inventario_conserva_venta_pendiente_reintentable(
        self,
        registrar_venta,
    ):
        from .clients.inventario_client import InventarioNoDisponible

        registrar_venta.side_effect = [
            InventarioNoDisponible(),
            [],
        ]
        datos = {
            'referencia': 'TEST-REINTENTO',
            'observacion': '',
            'detalles': [
                {
                    'medicamento_id': 1,
                    'medicamento_nombre': 'Paracetamol',
                    'cantidad': 2,
                    'precio_unitario': '12.50',
                }
            ],
        }

        fallida = self.client.post(self.url, datos, format='json')
        pendiente = Venta.objects.get(referencia='TEST-REINTENTO')
        reintentada = self.client.post(self.url, datos, format='json')

        self.assertEqual(
            fallida.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertEqual(pendiente.estado, 'pendiente')
        self.assertEqual(reintentada.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Venta.objects.count(), 1)
        self.assertEqual(
            Venta.objects.get(referencia='TEST-REINTENTO').estado,
            'completada',
        )
        self.assertEqual(registrar_venta.call_count, 2)

    @patch('ventas.services.venta_service.InventarioClient.registrar_venta')
    def test_stock_insuficiente_se_expone_como_conflicto(
        self,
        registrar_venta,
    ):
        from .clients.inventario_client import StockInsuficiente

        registrar_venta.side_effect = StockInsuficiente()
        response = self.client.post(
            self.url,
            {
                'referencia': 'TEST-STOCK-409',
                'observacion': '',
                'detalles': [
                    {
                        'medicamento_id': 1,
                        'medicamento_nombre': 'Paracetamol',
                        'cantidad': 2,
                        'precio_unitario': '12.50',
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            Venta.objects.get(referencia='TEST-STOCK-409').estado,
            'pendiente',
        )

    def test_rechazar_venta_sin_detalles(self):
        datos = {
            'referencia': 'TEST-V003',
            'estado': 'pendiente',
            'observacion': 'Venta sin detalles',
            'detalles': [],
        }

        response = self.client.post(
            self.url,
            datos,
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Venta.objects.count(),
            0,
        )

    def test_rechazar_cantidad_cero(self):
        datos = {
            'referencia': 'TEST-V004',
            'estado': 'pendiente',
            'observacion': 'Cantidad inválida',
            'detalles': [
                {
                    'medicamento_id': 1,
                    'medicamento_nombre': 'Paracetamol',
                    'cantidad': 0,
                    'precio_unitario': '10.00',
                }
            ],
        }

        response = self.client.post(
            self.url,
            datos,
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Venta.objects.count(),
            0,
        )

    def test_rechazar_precio_cero(self):
        datos = {
            'referencia': 'TEST-V005',
            'estado': 'pendiente',
            'observacion': 'Precio inválido',
            'detalles': [
                {
                    'medicamento_id': 1,
                    'medicamento_nombre': 'Paracetamol',
                    'cantidad': 1,
                    'precio_unitario': '0.00',
                }
            ],
        }

        response = self.client.post(
            self.url,
            datos,
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Venta.objects.count(),
            0,
        )

    def test_no_permitir_borrar_venta_sin_devolucion_stock(self):
        venta = Venta.objects.create(
            referencia='TEST-NO-DELETE',
            estado='completada',
            total=Decimal('10.00'),
        )

        response = self.client.delete(f'{self.url}{venta.id}/')

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Venta.objects.filter(pk=venta.pk).exists())


class InventarioClientContractTests(SimpleTestCase):
    @patch('ventas.clients.inventario_client.requests.post')
    def test_envia_referencia_detalles_y_jwt_al_endpoint_fefo(
        self,
        post,
    ):
        respuesta = Mock()
        respuesta.status_code = 200
        respuesta.json.return_value = []
        post.return_value = respuesta

        resultado = InventarioClient.registrar_venta(
            referencia='V-HTTP-001',
            detalles=[{'medicamento_id': 4, 'cantidad': 2}],
            authorization='Bearer token-de-prueba',
        )

        self.assertEqual(resultado, [])
        post.assert_called_once_with(
            'http://mc-inventario:8000/movimientos/registrar-venta/',
            json={
                'referencia': 'V-HTTP-001',
                'detalles': [{'medicamento_id': 4, 'cantidad': 2}],
            },
            headers={'Authorization': 'Bearer token-de-prueba'},
            timeout=InventarioClient.TIMEOUT,
        )

    @patch('ventas.clients.inventario_client.requests.post')
    def test_traduce_stock_insuficiente_y_errores_de_red(self, post):
        respuesta = Mock()
        respuesta.status_code = 400
        respuesta.json.return_value = {
            'detalle': 'Stock insuficiente para el medicamento 4.'
        }
        post.return_value = respuesta

        with self.assertRaises(StockInsuficiente):
            InventarioClient.registrar_venta(
                referencia='V-HTTP-002',
                detalles=[{'medicamento_id': 4, 'cantidad': 99}],
            )

        from requests import Timeout

        post.side_effect = Timeout('tiempo agotado')
        with self.assertRaises(InventarioNoDisponible):
            InventarioClient.registrar_venta(
                referencia='V-HTTP-003',
                detalles=[{'medicamento_id': 4, 'cantidad': 1}],
            )


class VentaSeguridadTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = '/ventas/'

    def test_listar_ventas_sin_token_devuelve_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_crear_venta_sin_token_devuelve_401(self):
        datos = {
            'referencia': 'TEST-SEC-001',
            'detalles': [{'medicamento_id': 1, 'cantidad': 1, 'precio_unitario': '10.00'}],
        }
        response = self.client.post(self.url, datos, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_malformado_devuelve_401(self):
        response = self.client.get(self.url, HTTP_AUTHORIZATION='TokenInvalido')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('ventas.authentication.urlopen')
    def test_token_invalido_o_expirado_devuelve_401(self, mock_urlopen):
        from urllib.error import HTTPError
        from io import BytesIO
        mock_urlopen.side_effect = HTTPError(
            url='http://mc-usuarios:8000/usuarios/me/',
            code=401,
            msg='Unauthorized',
            hdrs={},
            fp=BytesIO(b'{"detail":"Token invalido"}'),
        )
        response = self.client.get(self.url, HTTP_AUTHORIZATION='Bearer token-expirado')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('ventas.authentication.urlopen')
    def test_usuario_inactivo_devuelve_403(self, mock_urlopen):
        from io import BytesIO
        mock_res = Mock()
        mock_res.status = 200
        mock_res.read.return_value = b'{"id": 2, "username": "inactivo", "rol": "auxiliar", "activo": false}'
        mock_urlopen.return_value.__enter__.return_value = mock_res

        response = self.client.get(self.url, HTTP_AUTHORIZATION='Bearer token-inactivo')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('ventas.authentication.urlopen')
    def test_usuario_rol_no_autorizado_devuelve_403(self, mock_urlopen):
        from io import BytesIO
        mock_res = Mock()
        mock_res.status = 200
        mock_res.read.return_value = b'{"id": 3, "username": "invitado", "rol": "cliente", "activo": true}'
        mock_urlopen.return_value.__enter__.return_value = mock_res

        response = self.client.get(self.url, HTTP_AUTHORIZATION='Bearer token-invitado')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_auxiliar_autenticado_puede_listar_ventas(self):
        self.client.force_authenticate(user=usuario_erp(rol='auxiliar'))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('ventas.services.venta_service.InventarioClient.registrar_venta')
    def test_auxiliar_autenticado_puede_crear_venta(self, mock_inventario):
        self.client.force_authenticate(user=usuario_erp(rol='auxiliar'))
        datos = {
            'referencia': 'TEST-AUX-001',
            'detalles': [
                {
                    'medicamento_id': 1,
                    'medicamento_nombre': 'Paracetamol',
                    'cantidad': 1,
                    'precio_unitario': '10.00',
                }
            ],
        }
        response = self.client.post(self.url, datos, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_administrador_autenticado_puede_listar_ventas(self):
        self.client.force_authenticate(user=usuario_erp(rol='administrador'))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)