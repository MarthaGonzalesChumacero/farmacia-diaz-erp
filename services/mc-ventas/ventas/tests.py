from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Venta


class VentaAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = '/ventas/'

    def test_crear_venta_correctamente(self):
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

    def test_calcular_total_con_varios_detalles(self):
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