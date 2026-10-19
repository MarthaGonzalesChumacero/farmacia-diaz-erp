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

    def test_auxiliar_no_puede_verificar_vencimientos(self):
        self.client.force_authenticate(
            user=usuario_erp(101, "auxiliar-prueba", "auxiliar")
        )
        respuesta = self.client.post("/alertas/verificar-vencimientos/")
        self.assertEqual(respuesta.status_code, 403)

    def test_administrador_puede_verificar_vencimientos(self):
        respuesta = self.client.post("/alertas/verificar-vencimientos/")
        self.assertEqual(respuesta.status_code, 200)

    def test_no_duplica_alerta_vencimiento_con_diferentes_dias(self):
        hoy = timezone.localdate()
        fecha_vencimiento = hoy + timezone.timedelta(days=10)

        lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-DIFF-DAYS",
            fecha_vencimiento=fecha_vencimiento,
            cantidad_inicial=15,
            cantidad_actual=15,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        # Simular alerta generada días atrás cuando faltaban 15 días
        alerta_previa = Alerta.objects.create(
            medicamento=self.medicamento,
            tipo="vencimiento",
            mensaje=(
                f"El lote {lote.numero_lote} del medicamento "
                f"{self.medicamento.nombre} vence en 15 días, el "
                f"{fecha_vencimiento.strftime('%d/%m/%Y')}."
            ),
            leida=False,
        )

        resultado = VencimientoService.generar_alertas_vencimiento(dias=30)

        # No debe crear una nueva alerta, debe mantener 1 y actualizar mensaje
        self.assertEqual(resultado["alertas_creadas"], 0)
        total_alertas = Alerta.objects.filter(
            medicamento=self.medicamento,
            tipo="vencimiento",
            leida=False,
        ).count()
        self.assertEqual(total_alertas, 1)

        alerta_previa.refresh_from_db()
        self.assertIn("10 días", alerta_previa.mensaje)

    def test_verificar_vencimientos_celery_no_duplica(self):
        from inventory.tasks import verificar_vencimientos

        hoy = timezone.localdate()
        fecha_vencimiento = hoy + timezone.timedelta(days=8)

        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-CELERY-VENC",
            fecha_vencimiento=fecha_vencimiento,
            cantidad_inicial=10,
            cantidad_actual=10,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        resultado_1 = verificar_vencimientos()
        self.assertEqual(resultado_1["alertas_creadas"], 1)

        resultado_2 = verificar_vencimientos()
        self.assertEqual(resultado_2["alertas_creadas"], 0)

        total_pendientes = Alerta.objects.filter(
            medicamento=self.medicamento,
            tipo="vencimiento",
            leida=False,
        ).count()
        self.assertEqual(total_pendientes, 1)

    def test_reposicion_stock_actualiza_alerta_a_revisada_con_auditoria(self):
        # Alerta previa de medicamento agotado
        alerta = Alerta.objects.create(
            medicamento=self.medicamento,
            tipo="stock",
            mensaje=f"Medicamento agotado: {self.medicamento.nombre} tiene 0 unidades disponibles.",
            leida=False,
        )

        # Se repone stock: lote con 18 unidades (stock mínimo es 10)
        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-REPOSICION-01",
            fecha_vencimiento=timezone.localdate() + timezone.timedelta(days=180),
            cantidad_inicial=18,
            cantidad_actual=18,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        StockService.verificar_stock_medicamento(self.medicamento)

        alerta.refresh_from_db()
        # Debe haberse marcado como revisada
        self.assertTrue(alerta.leida)

        # Debe conservarse el registro en base de datos (no eliminado)
        self.assertTrue(Alerta.objects.filter(id=alerta.id).exists())

        # Debe haberse creado un evento de auditoría
        auditoria = RegistroAuditoria.objects.filter(
            entidad="alerta",
            entidad_id=alerta.id,
            accion="marcar_revisada",
        ).first()
        self.assertIsNotNone(auditoria)
        self.assertEqual(auditoria.detalles.get("motivo"), "reposicion_stock")
        self.assertEqual(auditoria.detalles.get("stock_actual"), 18)

    def test_reposicion_parcial_actualiza_mensaje_alerta_stock(self):
        alerta = Alerta.objects.create(
            medicamento=self.medicamento,
            tipo="stock",
            mensaje=f"Medicamento agotado: {self.medicamento.nombre} tiene 0 unidades disponibles.",
            leida=False,
        )

        # Reponer pero aún bajo stock mínimo (3 de 10)
        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-PARCIAL-01",
            fecha_vencimiento=timezone.localdate() + timezone.timedelta(days=180),
            cantidad_inicial=3,
            cantidad_actual=3,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        StockService.verificar_stock_medicamento(self.medicamento)

        alerta.refresh_from_db()
        self.assertFalse(alerta.leida)
        self.assertIn("3 unidades", alerta.mensaje)
        self.assertIn("Stock crítico", alerta.mensaje)

    def test_listar_alertas_sincroniza_automaticamente_stock_repuesto(self):
        # Crear alerta desactualizada de stock
        alerta = Alerta.objects.create(
            medicamento=self.medicamento,
            tipo="stock",
            mensaje=f"Medicamento agotado: {self.medicamento.nombre} tiene 0 unidades disponibles.",
            leida=False,
        )

        # Reponer stock
        Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-SYNC-01",
            fecha_vencimiento=timezone.localdate() + timezone.timedelta(days=180),
            cantidad_inicial=25,
            cantidad_actual=25,
            precio_compra=10.00,
            precio_venta=15.00,
        )

        # Al consultar alertas mediante la API
        respuesta = self.client.get("/alertas/")
        self.assertEqual(respuesta.status_code, 200)

        alerta.refresh_from_db()
        self.assertTrue(alerta.leida)