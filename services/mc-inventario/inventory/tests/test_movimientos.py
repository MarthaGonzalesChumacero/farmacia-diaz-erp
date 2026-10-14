from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.admin.sites import AdminSite

from inventory.models import (
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
    MovimientoInventario,
    RegistroAuditoria,
)
from inventory.admin import LoteAdmin, MovimientoInventarioAdmin
from inventory.services.movimiento_service import MovimientoService
from inventory.tests.usuario_prueba import usuario_erp


class MovimientoServiceTests(TestCase):

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

    def test_admin_no_permite_editar_lotes_ni_kardex(self):
        sitio = AdminSite()
        admin_lote = LoteAdmin(Lote, sitio)
        admin_movimiento = MovimientoInventarioAdmin(
            MovimientoInventario,
            sitio,
        )

        self.assertFalse(admin_lote.has_add_permission(None))
        self.assertFalse(admin_lote.has_change_permission(None))
        self.assertFalse(admin_lote.has_delete_permission(None))
        self.assertFalse(admin_movimiento.has_add_permission(None))
        self.assertFalse(admin_movimiento.has_change_permission(None))
        self.assertFalse(admin_movimiento.has_delete_permission(None))

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

    def test_venta_usa_lotes_fefo_y_omite_vencidos(self):
        hoy = timezone.localdate()
        lote_proximo = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-FEFO-PROXIMO",
            fecha_vencimiento=hoy + timedelta(days=2),
            cantidad_inicial=5,
            cantidad_actual=5,
            precio_compra=8.50,
            precio_venta=12.00,
        )
        lote_vencido = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-FEFO-VENCIDO",
            fecha_vencimiento=hoy - timedelta(days=1),
            cantidad_inicial=100,
            cantidad_actual=100,
            precio_compra=8.50,
            precio_venta=12.00,
        )

        movimientos = MovimientoService.registrar_venta(
            referencia="TEST-FEFO",
            detalles=[
                {
                    "medicamento_id": self.medicamento.id,
                    "cantidad": 7,
                }
            ],
        )

        self.lote.refresh_from_db()
        lote_proximo.refresh_from_db()
        lote_vencido.refresh_from_db()

        self.assertEqual(
            [movimiento.lote_id for movimiento in movimientos],
            [lote_proximo.id, self.lote.id],
        )
        self.assertEqual(lote_proximo.cantidad_actual, 0)
        self.assertEqual(self.lote.cantidad_actual, 98)
        self.assertEqual(lote_vencido.cantidad_actual, 100)

    def test_reintentar_referencia_no_descuenta_dos_veces(self):
        detalles = [
            {
                "medicamento_id": self.medicamento.id,
                "cantidad": 7,
            }
        ]

        primera = MovimientoService.registrar_venta(
            referencia="TEST-IDEMPOTENTE",
            detalles=detalles,
        )
        segunda = MovimientoService.registrar_venta(
            referencia="TEST-IDEMPOTENTE",
            detalles=detalles,
        )

        self.lote.refresh_from_db()
        self.assertEqual(len(primera), 1)
        self.assertEqual(len(segunda), 1)
        self.assertEqual(self.lote.cantidad_actual, 93)
        self.assertEqual(
            MovimientoInventario.objects.filter(
                referencia__startswith="V:TEST-IDEMPOTENTE:"
            ).count(),
            1,
        )

    def test_venta_insuficiente_no_crea_movimientos(self):
        with self.assertRaises(Exception):
            MovimientoService.registrar_venta(
                referencia="TEST-SIN-STOCK",
                detalles=[
                    {
                        "medicamento_id": self.medicamento.id,
                        "cantidad": 1000,
                    }
                ],
            )

        self.lote.refresh_from_db()
        self.assertEqual(self.lote.cantidad_actual, 100)
        self.assertFalse(
            MovimientoInventario.objects.filter(
                referencia__startswith="V:TEST-SIN-STOCK:"
            ).exists()
        )

    def test_venta_rechaza_medicamento_inactivo(self):
        self.medicamento.activo = False
        self.medicamento.save(update_fields=["activo"])

        with self.assertRaises(Exception):
            MovimientoService.registrar_venta(
                referencia="TEST-MED-INACTIVO",
                detalles=[
                    {
                        "medicamento_id": self.medicamento.id,
                        "cantidad": 1,
                    }
                ],
            )

        self.lote.refresh_from_db()
        self.assertEqual(self.lote.cantidad_actual, 100)
        self.assertFalse(
            MovimientoInventario.objects.filter(
                referencia__startswith="V:TEST-MED-INACTIVO:"
            ).exists()
        )

    def test_endpoint_registra_venta_con_referencia_idempotente(self):
        payload = {
            "referencia": "TEST-API-VENTA",
            "detalles": [
                {
                    "medicamento_id": self.medicamento.id,
                    "cantidad": 4,
                }
            ],
        }

        primera = self.client.post(
            "/movimientos/registrar-venta/",
            payload,
            format="json",
        )
        segunda = self.client.post(
            "/movimientos/registrar-venta/",
            payload,
            format="json",
        )

        self.lote.refresh_from_db()
        self.assertEqual(primera.status_code, 200)
        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(len(primera.data), 1)
        self.assertEqual(len(segunda.data), 1)
        self.assertEqual(self.lote.cantidad_actual, 96)
        self.assertTrue(
            RegistroAuditoria.objects.filter(
                entidad="venta",
                accion="venta_descuento",
                referencia="TEST-API-VENTA",
            ).exists()
        )

    def test_endpoint_rechaza_stock_insuficiente_sin_descontar(self):
        response = self.client.post(
            "/movimientos/registrar-venta/",
            {
                "referencia": "TEST-API-STOCK-INSUFICIENTE",
                "detalles": [
                    {
                        "medicamento_id": self.medicamento.id,
                        "cantidad": 1000,
                    }
                ],
            },
            format="json",
        )

        self.lote.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.lote.cantidad_actual, 100)
        self.assertFalse(
            MovimientoInventario.objects.filter(
                referencia__startswith="V:TEST-API-STOCK-INSUFICIENTE:"
            ).exists()
        )

    def test_crear_lote_registra_entrada_inicial(self):
        response = self.client.post(
            "/lotes/",
            {
                "medicamento": self.medicamento.id,
                "numero_lote": "LOTE-API-INICIAL",
                "fecha_vencimiento": "2027-12-31",
                "cantidad_inicial": 12,
                "cantidad_actual": 999,
                "precio_compra": "8.50",
                "precio_venta": "12.00",
                "activo": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        lote = Lote.objects.get(numero_lote="LOTE-API-INICIAL")
        self.assertEqual(lote.cantidad_actual, 12)
        movimiento = MovimientoInventario.objects.get(lote=lote)
        self.assertEqual(movimiento.tipo, "entrada")
        self.assertEqual(movimiento.cantidad, 12)
        self.assertEqual(movimiento.stock_resultante, 12)

    def test_api_no_permite_editar_stock_de_lote_directamente(self):
        response = self.client.patch(
            f"/lotes/{self.lote.id}/",
            {"cantidad_actual": 1},
            format="json",
        )

        self.lote.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.lote.cantidad_actual, 100)

    def test_movimiento_requiere_motivo(self):
        response = self.client.post(
            "/movimientos/",
            {
                "lote": self.lote.id,
                "tipo": "entrada",
                "cantidad": 1,
                "motivo": "   ",
            },
            format="json",
        )

        self.lote.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.lote.cantidad_actual, 100)

    def test_endpoint_registra_entrada_y_saldo_en_kardex(self):
        response = self.client.post(
            "/movimientos/",
            {
                "lote": self.lote.id,
                "tipo": "entrada",
                "cantidad": 5,
                "motivo": "Recepción de proveedor",
                "referencia": "TEST-ENTRADA-API",
            },
            format="json",
        )

        self.lote.refresh_from_db()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.lote.cantidad_actual, 105)
        self.assertEqual(response.data["stock_resultante"], 105)
        self.assertTrue(
            MovimientoInventario.objects.filter(
                referencia="TEST-ENTRADA-API",
                motivo="Recepción de proveedor",
            ).exists()
        )
        self.assertTrue(
            RegistroAuditoria.objects.filter(
                entidad="movimiento",
                entidad_id=response.data["id"],
                accion="entrada",
                actor_username="admin-prueba",
            ).exists()
        )