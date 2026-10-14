from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from inventory.models import (
    Alerta,
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
    RegistroAuditoria,
)
from inventory.services.stock_service import StockService
from inventory.services.vencimiento_service import VencimientoService
from inventory.tests.usuario_prueba import usuario_erp


class AlertaServiceTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=usuario_erp())
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

    def test_stock_utilizable_excluye_lotes_vencidos(self):
        hoy = timezone.localdate()
        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-VALIDO-STOCK",
            fecha_vencimiento=hoy + timezone.timedelta(days=30),
            cantidad_inicial=4,
            cantidad_actual=4,
            precio_compra=10.00,
            precio_venta=15.00,
        )
        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-VENCIDO-STOCK",
            fecha_vencimiento=hoy - timezone.timedelta(days=1),
            cantidad_inicial=40,
            cantidad_actual=40,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        self.assertEqual(
            StockService.calcular_stock_total(self.medicamento),
            4,
        )

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

    def test_api_permite_marcar_y_reabrir_alerta(self):
        alerta = Alerta.objects.create(
            medicamento=self.medicamento,
            tipo="stock",
            mensaje="Stock crítico de prueba",
        )

        marcar_leida = self.client.patch(
            f"/alertas/{alerta.id}/estado/",
            {"leida": True},
            format="json",
        )
        alerta.refresh_from_db()

        self.assertEqual(marcar_leida.status_code, 200)
        self.assertTrue(alerta.leida)
        self.assertTrue(
            RegistroAuditoria.objects.filter(
                entidad="alerta",
                entidad_id=alerta.id,
                accion="marcar_revisada",
            ).exists()
        )

        marcar_pendiente = self.client.patch(
            f"/alertas/{alerta.id}/estado/",
            {"leida": False},
            format="json",
        )
        alerta.refresh_from_db()

        self.assertEqual(marcar_pendiente.status_code, 200)
        self.assertFalse(alerta.leida)

    def test_auxiliar_consulta_alertas_sin_cambiar_su_estado(self):
        alerta = Alerta.objects.create(
            medicamento=self.medicamento,
            tipo="stock",
            mensaje="Alerta solo lectura",
        )
        self.client.force_authenticate(
            user=usuario_erp(101, "auxiliar-prueba", "auxiliar")
        )

        listar = self.client.get("/alertas/")
        editar = self.client.patch(
            f"/alertas/{alerta.id}/estado/",
            {"leida": True},
            format="json",
        )

        alerta.refresh_from_db()
        self.assertEqual(listar.status_code, 200)
        self.assertEqual(editar.status_code, 403)
        self.assertFalse(alerta.leida)