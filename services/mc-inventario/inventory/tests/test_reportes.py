from django.test import TestCase
from django.utils import timezone

from inventory.models import (
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
)
from inventory.services.movimiento_service import MovimientoService
from inventory.services.reporte_service import ReporteService


class ReporteServiceTests(TestCase):

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre="Analgésicos",
            descripcion="Prueba",
        )

        self.laboratorio = Laboratorio.objects.create(
            nombre="INTI",
            descripcion="Prueba",
        )

        self.medicamento = Medicamento.objects.create(
            nombre="Paracetamol",
            principio_activo="Paracetamol",
            presentacion="Tabletas 500 mg",
            codigo_barras="TEST-REP-001",
            registro_sanitario="RS-TEST-REP-001",
            descripcion="Medicamento de prueba",
            stock_minimo=20,
            unidad_medida="caja",
            categoria=self.categoria,
            laboratorio=self.laboratorio,
        )

    def test_reporte_stock_critico(self):
        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-CRITICO-001",
            fecha_vencimiento="2027-12-31",
            cantidad_inicial=10,
            cantidad_actual=10,
            precio_compra=8.50,
            precio_venta=12.00,
        )

        resultado = (
            ReporteService.obtener_reporte_stock_critico()
        )

        self.assertEqual(
            resultado["total_registros"],
            1,
        )

        self.assertEqual(
            resultado["resultados"][0]["medicamento"],
            "Paracetamol",
        )

    def test_reporte_vencimientos(self):
        hoy = timezone.now().date()

        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-VENCE-REP-001",
            fecha_vencimiento=(
                hoy + timezone.timedelta(days=10)
            ),
            cantidad_inicial=30,
            cantidad_actual=30,
            precio_compra=8.50,
            precio_venta=12.00,
        )

        resultado = (
            ReporteService.obtener_reporte_vencimientos(
                dias=30
            )
        )

        self.assertEqual(
            resultado["total_registros"],
            1,
        )

        self.assertEqual(
            resultado["resultados"][0]["numero_lote"],
            "LOTE-VENCE-REP-001",
        )

    def test_reporte_kardex(self):
        lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-KARDEX-001",
            fecha_vencimiento="2027-12-31",
            cantidad_inicial=100,
            cantidad_actual=100,
            precio_compra=8.50,
            precio_venta=12.00,
        )

        MovimientoService.registrar_movimiento(
            lote=lote,
            tipo="salida",
            cantidad=10,
            motivo="Prueba Kardex",
            referencia="KARDEX-001",
        )

        resultado = (
            ReporteService.obtener_reporte_kardex()
        )

        self.assertEqual(
            resultado["total_registros"],
            1,
        )

        self.assertEqual(
            resultado["resultados"][0]["cantidad"],
            10,
        )

        self.assertEqual(
            resultado["resultados"][0]["stock_resultante"],
            90,
        )