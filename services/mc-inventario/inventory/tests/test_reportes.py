from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from inventory.models import (
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
)
from inventory.services.movimiento_service import MovimientoService
from inventory.services.reporte_service import ReporteService
from inventory.tests.usuario_prueba import usuario_erp


class ReporteServiceTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=usuario_erp())
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

    def test_stock_critico_se_agrega_por_medicamento_y_omite_vencidos(self):
        hoy = timezone.localdate()
        lote_a = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-AGREGADO-A",
            fecha_vencimiento=hoy + timezone.timedelta(days=90),
            cantidad_inicial=12,
            cantidad_actual=12,
            precio_compra=8.50,
            precio_venta=12.00,
        )
        lote_b = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-AGREGADO-B",
            fecha_vencimiento=hoy + timezone.timedelta(days=120),
            cantidad_inicial=12,
            cantidad_actual=12,
            precio_compra=8.50,
            precio_venta=12.00,
        )
        lote_vencido = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-AGREGADO-VENCIDO",
            fecha_vencimiento=hoy - timezone.timedelta(days=1),
            cantidad_inicial=100,
            cantidad_actual=100,
            precio_compra=8.50,
            precio_venta=12.00,
        )

        resultado_normal = ReporteService.obtener_reporte_stock_critico()
        self.assertEqual(resultado_normal["total_registros"], 0)

        lote_a.cantidad_actual = 0
        lote_b.cantidad_actual = 0
        lote_a.save(update_fields=["cantidad_actual"])
        lote_b.save(update_fields=["cantidad_actual"])
        resultado_sin_stock_util = (
            ReporteService.obtener_reporte_stock_critico()
        )

        self.assertEqual(resultado_sin_stock_util["total_registros"], 1)
        self.assertEqual(
            resultado_sin_stock_util["resultados"][0]["stock_actual"],
            0,
        )
        self.assertEqual(lote_vencido.cantidad_actual, 100)

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

    def test_api_kardex_filtra_por_tipo_y_rango_de_fechas(self):
        lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-FILTRO-KARDEX",
            fecha_vencimiento="2027-12-31",
            cantidad_inicial=100,
            cantidad_actual=100,
            precio_compra=8.50,
            precio_venta=12.00,
        )
        MovimientoService.registrar_movimiento(
            lote=lote,
            tipo="salida",
            cantidad=2,
            motivo="Venta de prueba",
            referencia="KARDEX-FILTRO-SALIDA",
        )
        MovimientoService.registrar_movimiento(
            lote=lote,
            tipo="entrada",
            cantidad=5,
            motivo="Reposición de prueba",
            referencia="KARDEX-FILTRO-ENTRADA",
        )
        hoy = timezone.localdate().isoformat()

        respuesta = self.client.get(
            "/movimientos/reporte-kardex/",
            {"tipo": "salida", "desde": hoy, "hasta": hoy},
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data["total_registros"], 1)
        self.assertEqual(respuesta.data["resultados"][0]["tipo"], "salida")

    def test_api_kardex_rechaza_rango_de_fechas_invertido(self):
        respuesta = self.client.get(
            "/movimientos/reporte-kardex/",
            {"desde": "2026-12-31", "hasta": "2026-01-01"},
        )

        self.assertEqual(respuesta.status_code, 400)

    def test_auxiliar_no_consulta_kardex_restringido(self):
        self.client.force_authenticate(
            user=usuario_erp(101, "auxiliar-prueba", "auxiliar")
        )

        respuesta = self.client.get("/movimientos/reporte-kardex/")

        self.assertEqual(respuesta.status_code, 403)