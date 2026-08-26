from django.test import TestCase

from inventory.models import (
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
)
from inventory.services.movimiento_service import MovimientoService


class MovimientoServiceTests(TestCase):

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
            codigo_barras="TEST-001",
            registro_sanitario="RS-TEST-001",
            descripcion="Medicamento de prueba",
            stock_minimo=20,
            unidad_medida="caja",
            categoria=self.categoria,
            laboratorio=self.laboratorio,
        )

        self.lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-TEST-001",
            fecha_vencimiento="2027-12-31",
            cantidad_inicial=100,
            cantidad_actual=100,
            precio_compra=8.50,
            precio_venta=12.00,
        )

    def test_entrada_aumenta_stock(self):
        MovimientoService.registrar_movimiento(
            lote=self.lote,
            tipo="entrada",
            cantidad=10,
            motivo="Entrada de prueba",
            referencia="TEST-ENTRADA-001",
        )

        self.lote.refresh_from_db()

        self.assertEqual(
            self.lote.cantidad_actual,
            110,
        )

    def test_salida_disminuye_stock(self):
        MovimientoService.registrar_movimiento(
            lote=self.lote,
            tipo="salida",
            cantidad=20,
            motivo="Salida de prueba",
            referencia="TEST-SALIDA-001",
        )

        self.lote.refresh_from_db()

        self.assertEqual(
            self.lote.cantidad_actual,
            80,
        )

    def test_no_permite_stock_insuficiente(self):
        with self.assertRaises(Exception):
            MovimientoService.registrar_movimiento(
                lote=self.lote,
                tipo="salida",
                cantidad=150,
                motivo="Salida inválida",
                referencia="TEST-SALIDA-002",
            )

        self.lote.refresh_from_db()

        self.assertEqual(
            self.lote.cantidad_actual,
            100,
        )

    def test_no_permite_referencia_duplicada(self):
        MovimientoService.registrar_movimiento(
            lote=self.lote,
            tipo="entrada",
            cantidad=5,
            motivo="Primera operación",
            referencia="TEST-DUP-001",
        )

        with self.assertRaises(Exception):
            MovimientoService.registrar_movimiento(
                lote=self.lote,
                tipo="entrada",
                cantidad=5,
                motivo="Operación duplicada",
                referencia="TEST-DUP-001",
            )