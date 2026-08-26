from django.test import TestCase
from django.utils import timezone

from inventory.models import (
    Alerta,
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
)
from inventory.services.stock_service import StockService
from inventory.services.vencimiento_service import VencimientoService


class AlertaServiceTests(TestCase):

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre="Vitaminas",
            descripcion="Prueba",
        )

        self.laboratorio = Laboratorio.objects.create(
            nombre="Bagó",
            descripcion="Prueba",
        )

        self.medicamento = Medicamento.objects.create(
            nombre="Vitamina C",
            principio_activo="Ácido ascórbico",
            presentacion="Tabletas 500 mg",
            codigo_barras="TEST-VIT-001",
            registro_sanitario="RS-TEST-VIT-001",
            descripcion="Medicamento de prueba",
            stock_minimo=10,
            unidad_medida="caja",
            categoria=self.categoria,
            laboratorio=self.laboratorio,
        )

    def test_crea_alerta_stock_critico(self):
        lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-STOCK-001",
            fecha_vencimiento="2027-12-31",
            cantidad_inicial=10,
            cantidad_actual=5,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        StockService.verificar_stock_minimo(lote)

        alerta = Alerta.objects.filter(
            medicamento=self.medicamento,
            tipo="stock",
        ).first()

        self.assertIsNotNone(alerta)
        self.assertFalse(alerta.leida)

    def test_no_duplica_alerta_stock(self):
        lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-STOCK-002",
            fecha_vencimiento="2027-12-31",
            cantidad_inicial=10,
            cantidad_actual=5,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        StockService.verificar_stock_minimo(lote)
        StockService.verificar_stock_minimo(lote)

        total = Alerta.objects.filter(
            medicamento=self.medicamento,
            tipo="stock",
            leida=False,
        ).count()

        self.assertEqual(total, 1)

    def test_crea_alerta_vencimiento(self):
        hoy = timezone.now().date()
        fecha_vencimiento = hoy + timezone.timedelta(days=10)

        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-VENCE-001",
            fecha_vencimiento=fecha_vencimiento,
            cantidad_inicial=20,
            cantidad_actual=20,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        resultado = (
            VencimientoService.generar_alertas_vencimiento(
                dias=30
            )
        )

        self.assertEqual(
            resultado["alertas_creadas"],
            1,
        )

        self.assertTrue(
            Alerta.objects.filter(
                medicamento=self.medicamento,
                tipo="vencimiento",
            ).exists()
        )

    def test_no_duplica_alerta_vencimiento(self):
        hoy = timezone.now().date()
        fecha_vencimiento = hoy + timezone.timedelta(days=10)

        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-VENCE-002",
            fecha_vencimiento=fecha_vencimiento,
            cantidad_inicial=20,
            cantidad_actual=20,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        VencimientoService.generar_alertas_vencimiento(
            dias=30
        )

        segundo_resultado = (
            VencimientoService.generar_alertas_vencimiento(
                dias=30
            )
        )

        self.assertEqual(
            segundo_resultado["alertas_creadas"],
            0,
        )