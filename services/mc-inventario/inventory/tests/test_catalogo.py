from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch
from urllib.error import URLError

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.test import APIRequestFactory

from inventory.models import (
    Alerta,
    Categoria,
    Lote,
    Medicamento,
    MovimientoInventario,
    Proveedor,
    RegistroAuditoria,
)
from inventory.services.auditoria_service import AuditoriaService
from inventory.tests.usuario_prueba import usuario_erp


class CatalogoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=usuario_erp())
        self.categoria = Categoria.objects.create(nombre="Prueba catálogo")
        self.medicamento = Medicamento.objects.create(
            nombre="Paracetamol 500 mg",
            principio_activo="Paracetamol",
            presentacion="Tableta",
            codigo_barras="CAT-0001",
            stock_minimo=5,
            categoria=self.categoria,
        )
        self.fecha_futura = (
            timezone.localdate() + timedelta(days=180)
        ).isoformat()

    def crear_lote(self, **cambios):
        datos = {
            "medicamento": self.medicamento.id,
            "numero_lote": "LOTE-CAT-001",
            "fecha_vencimiento": self.fecha_futura,
            "cantidad_inicial": 8,
            "cantidad_actual": 999,
            "precio_compra": "5.00",
            "precio_venta": "8.00",
            "activo": True,
        }
        datos.update(cambios)
        return self.client.post("/lotes/", datos, format="json")

    def test_proveedor_se_registra_y_se_asocia_a_lote(self):
        proveedor_response = self.client.post(
            "/proveedores/",
            {
                "nombre": "Distribuidora Sucre",
                "contacto": "Ana",
                "telefono": "70000000",
                "email": "ventas@example.test",
                "direccion": "Sucre",
                "activo": True,
            },
            format="json",
        )

        self.assertEqual(
            proveedor_response.status_code,
            status.HTTP_201_CREATED,
        )
        proveedor_id = proveedor_response.data["id"]
        lote_response = self.crear_lote(proveedor=proveedor_id)

        self.assertEqual(lote_response.status_code, status.HTTP_201_CREATED)
        lote = Lote.objects.get(pk=lote_response.data["id"])
        self.assertEqual(lote.proveedor_id, proveedor_id)
        self.assertEqual(lote.cantidad_actual, 8)
        self.assertTrue(
            MovimientoInventario.objects.filter(
                lote=lote,
                tipo="entrada",
                cantidad=8,
            ).exists()
        )
        self.assertTrue(
            RegistroAuditoria.objects.filter(
                entidad="lote",
                entidad_id=lote.id,
                accion="crear",
            ).exists()
        )

    def test_proveedor_admite_edicion_y_desactivacion_sin_borrado(self):
        proveedor = Proveedor.objects.create(nombre="Proveedor legado")

        editar = self.client.patch(
            f"/proveedores/{proveedor.id}/",
            {"telefono": "71112222"},
            format="json",
        )
        desactivar = self.client.patch(
            f"/proveedores/{proveedor.id}/",
            {"activo": False},
            format="json",
        )
        borrar = self.client.delete(f"/proveedores/{proveedor.id}/")

        proveedor.refresh_from_db()
        self.assertEqual(editar.status_code, status.HTTP_200_OK)
        self.assertEqual(desactivar.status_code, status.HTTP_200_OK)
        self.assertEqual(
            borrar.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertEqual(proveedor.telefono, "71112222")
        self.assertFalse(proveedor.activo)
        self.assertTrue(Proveedor.objects.filter(pk=proveedor.pk).exists())

    def test_medicamento_se_edita_y_desactiva_sin_borrarse(self):
        editar = self.client.patch(
            f"/medicamentos/{self.medicamento.id}/",
            {"nombre": "Paracetamol actualizado"},
            format="json",
        )
        desactivar = self.client.patch(
            f"/medicamentos/{self.medicamento.id}/",
            {"activo": False},
            format="json",
        )
        borrar = self.client.delete(
            f"/medicamentos/{self.medicamento.id}/"
        )

        self.medicamento.refresh_from_db()
        self.assertEqual(editar.status_code, status.HTTP_200_OK)
        self.assertEqual(desactivar.status_code, status.HTTP_200_OK)
        self.assertEqual(
            borrar.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertEqual(self.medicamento.nombre, "Paracetamol actualizado")
        self.assertFalse(self.medicamento.activo)
        self.assertTrue(
            Medicamento.objects.filter(pk=self.medicamento.pk).exists()
        )

    def test_busqueda_exacta_por_codigo_de_barras(self):
        respuesta = self.client.get(
            "/medicamentos/",
            {"codigo_barras": "CAT-0001"},
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data), 1)
        self.assertEqual(
            respuesta.data[0]["codigo_barras"],
            "CAT-0001",
        )

    def test_cambios_de_catalogo_quedan_en_auditoria_solo_lectura(self):
        respuesta = self.client.patch(
            f"/medicamentos/{self.medicamento.id}/",
            {"activo": False},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        evento = RegistroAuditoria.objects.get(
            entidad="medicamento",
            entidad_id=self.medicamento.id,
            accion="desactivar",
        )
        self.assertEqual(evento.actor_username, "admin-prueba")
        self.assertEqual(evento.detalles["activo"], {
            "antes": True,
            "despues": False,
        })

        self.assertTrue(
            RegistroAuditoria.objects.filter(pk=evento.pk).exists()
        )

    def test_auxiliar_consulta_inventario_pero_no_administra_catalogos(self):
        self.client.force_authenticate(
            user=usuario_erp(101, "auxiliar-prueba", "auxiliar")
        )
        consultar_medicamentos = self.client.get("/medicamentos/")
        consultar_lotes = self.client.get("/lotes/")
        consultar_alertas = self.client.get("/alertas/")
        consultar_stock_critico = self.client.get(
            "/alertas/reporte-stock-critico/"
        )
        editar_medicamento = self.client.patch(
            f"/medicamentos/{self.medicamento.id}/",
            {"nombre": "Cambio no autorizado"},
            format="json",
        )
        crear_proveedor = self.client.post(
            "/proveedores/",
            {"nombre": "Proveedor no autorizado"},
            format="json",
        )
        desactivar_medicamento = self.client.patch(
            f"/medicamentos/{self.medicamento.id}/",
            {"activo": False},
            format="json",
        )

        self.assertEqual(consultar_medicamentos.status_code, 200)
        self.assertEqual(consultar_lotes.status_code, 200)
        self.assertEqual(consultar_alertas.status_code, 200)
        self.assertEqual(consultar_stock_critico.status_code, 200)
        self.assertEqual(editar_medicamento.status_code, 403)
        self.assertEqual(crear_proveedor.status_code, 403)
        self.assertEqual(desactivar_medicamento.status_code, 403)
        self.medicamento.refresh_from_db()
        self.assertEqual(self.medicamento.nombre, "Paracetamol 500 mg")

    def test_auxiliar_no_puede_crear_lote_ni_movimiento_manual(self):
        self.client.force_authenticate(
            user=usuario_erp(101, "auxiliar-prueba", "auxiliar")
        )
        crear_lote = self.crear_lote(numero_lote="LOTE-AUX-RECHAZADO")
        crear_movimiento = self.client.post(
            "/movimientos/",
            {
                "lote": 1,
                "tipo": "entrada",
                "cantidad": 1,
                "motivo": "Ajuste no autorizado",
            },
            format="json",
        )

        self.assertEqual(crear_lote.status_code, 403)
        self.assertEqual(crear_movimiento.status_code, 403)
        self.assertFalse(Lote.objects.filter(numero_lote="LOTE-AUX-RECHAZADO").exists())

    def test_auxiliar_lee_catalogos_pero_no_edita_lote_proveedor_o_alerta(self):
        proveedor = Proveedor.objects.create(nombre="Proveedor protegido")
        lote = Lote.objects.create(
            medicamento=self.medicamento,
            proveedor=proveedor,
            numero_lote="LOTE-PROTEGIDO-AUX",
            fecha_vencimiento=timezone.localdate() + timedelta(days=90),
            cantidad_inicial=2,
            cantidad_actual=2,
            precio_compra=Decimal("1.00"),
            precio_venta=Decimal("2.00"),
        )
        alerta = Alerta.objects.create(
            medicamento=self.medicamento,
            tipo="stock",
            mensaje="Alerta de prueba",
        )
        self.client.force_authenticate(
            user=usuario_erp(101, "auxiliar-prueba", "auxiliar")
        )

        lecturas = [
            self.client.get("/medicamentos/"),
            self.client.get("/lotes/"),
            self.client.get("/proveedores/"),
            self.client.get("/alertas/"),
        ]
        escrituras = [
            self.client.post(
                "/medicamentos/",
                {
                    "nombre": "Nuevo", "principio_activo": "X",
                    "presentacion": "Caja", "codigo_barras": "AUX-X",
                },
                format="json",
            ),
            self.client.patch(
                f"/lotes/{lote.id}/",
                {"precio_venta": "3.00"},
                format="json",
            ),
            self.client.post(
                "/proveedores/",
                {"nombre": "Proveedor auxiliar"},
                format="json",
            ),
            self.client.patch(
                f"/alertas/{alerta.id}/estado/",
                {"leida": True},
                format="json",
            ),
            self.client.patch(
                f"/medicamentos/{self.medicamento.id}/",
                {"activo": False},
                format="json",
            ),
            self.client.patch(
                f"/lotes/{lote.id}/",
                {"activo": False},
                format="json",
            ),
            self.client.patch(
                f"/proveedores/{proveedor.id}/",
                {"activo": False},
                format="json",
            ),
        ]

        self.assertTrue(all(respuesta.status_code == 200 for respuesta in lecturas))
        self.assertTrue(all(respuesta.status_code == 403 for respuesta in escrituras))
        lote.refresh_from_db()
        alerta.refresh_from_db()
        self.assertEqual(lote.precio_venta, Decimal("2.00"))
        self.assertFalse(alerta.leida)

    def test_solicitudes_sin_autenticacion_rechazadas_en_api_inventario(self):
        cliente_anonimo = APIClient()
        proveedor = Proveedor.objects.create(nombre="Proveedor anónimo")
        lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-ANONIMO",
            fecha_vencimiento=timezone.localdate() + timedelta(days=90),
            cantidad_inicial=1,
            cantidad_actual=1,
            precio_compra=Decimal("1.00"),
            precio_venta=Decimal("2.00"),
        )
        lectura = cliente_anonimo.get("/medicamentos/")
        crear = cliente_anonimo.post(
            "/medicamentos/",
            {
                "nombre": "No autorizado", "principio_activo": "X",
                "presentacion": "Caja", "codigo_barras": "ANON-X",
            },
            format="json",
        )
        desactivar_medicamento = cliente_anonimo.patch(
            f"/medicamentos/{self.medicamento.id}/",
            {"activo": False},
            format="json",
        )
        desactivar_lote = cliente_anonimo.patch(
            f"/lotes/{lote.id}/",
            {"activo": False},
            format="json",
        )
        desactivar_proveedor = cliente_anonimo.patch(
            f"/proveedores/{proveedor.id}/",
            {"activo": False},
            format="json",
        )

        self.assertEqual(lectura.status_code, 403)
        self.assertEqual(crear.status_code, 403)
        self.assertEqual(desactivar_medicamento.status_code, 403)
        self.assertEqual(desactivar_lote.status_code, 403)
        self.assertEqual(desactivar_proveedor.status_code, 403)
        self.assertEqual(Medicamento.objects.count(), 1)

    def test_auxiliar_puede_registrar_venta_por_endpoint_interno(self):
        lote = Lote.objects.create(
            medicamento=self.medicamento,
            numero_lote="LOTE-AUX-VENTA",
            fecha_vencimiento=timezone.localdate() + timedelta(days=90),
            cantidad_inicial=3,
            cantidad_actual=3,
            precio_compra=Decimal("1.00"),
            precio_venta=Decimal("2.00"),
        )
        self.client.force_authenticate(
            user=usuario_erp(101, "auxiliar-prueba", "auxiliar")
        )

        respuesta = self.client.post(
            "/movimientos/registrar-venta/",
            {
                "referencia": "AUX-VENTA-PERMITIDA",
                "detalles": [
                    {"medicamento_id": self.medicamento.id, "cantidad": 1}
                ],
            },
            format="json",
        )

        lote.refresh_from_db()
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(lote.cantidad_actual, 2)

    def test_solicitudes_sin_usuario_erp_son_rechazadas(self):
        cliente_anonimo = APIClient()
        lectura = cliente_anonimo.get("/medicamentos/")
        escritura = cliente_anonimo.post(
            "/medicamentos/",
            {"nombre": "No autorizado"},
            format="json",
        )

        self.assertEqual(lectura.status_code, 403)
        self.assertEqual(escritura.status_code, 403)

    @patch("inventory.services.auditoria_service.urlopen")
    def test_auditoria_resuelve_actor_validando_jwt_en_usuarios(
        self,
        abrir_url,
    ):
        respuesta = MagicMock()
        respuesta.__enter__.return_value.read.return_value = (
            b'{"id": 17, "username": "administradora", "rol": "administrador"}'
        )
        abrir_url.return_value = respuesta
        request = APIRequestFactory().post(
            "/movimientos/",
            {},
            HTTP_AUTHORIZATION="Bearer token-validado",
        )

        evento = AuditoriaService.registrar(
            request=request,
            accion="entrada",
            entidad="movimiento",
        )

        self.assertEqual(evento.actor_id, 17)
        self.assertEqual(evento.actor_username, "administradora")
        self.assertEqual(abrir_url.call_args.args[0].full_url,
                         "http://mc-usuarios:8000/usuarios/me/")

    @patch("inventory.services.auditoria_service.urlopen")
    def test_auditoria_falla_a_anónimo_si_usuarios_no_responde(
        self,
        abrir_url,
    ):
        abrir_url.side_effect = URLError("servicio caído")
        request = APIRequestFactory().post(
            "/movimientos/",
            {},
            HTTP_AUTHORIZATION="Bearer token-no-validado",
        )

        evento = AuditoriaService.registrar(
            request=request,
            accion="salida",
            entidad="movimiento",
        )

        self.assertIsNone(evento.actor_id)
        self.assertEqual(evento.actor_username, "anónimo")

    @patch("inventory.services.auditoria_service.urlopen")
    def test_api_auditoria_solo_administrador_puede_leer(self, abrir_url):
        evento = RegistroAuditoria.objects.create(
            accion="desactivar",
            entidad="medicamento",
            entidad_id=self.medicamento.id,
            actor_username="admin-test",
        )
        respuesta = MagicMock()
        abrir_url.return_value = respuesta

        self.client.force_authenticate(user=None)
        anonimo = self.client.get("/auditoria/")
        self.assertEqual(anonimo.status_code, status.HTTP_403_FORBIDDEN)

        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-auxiliar")
        respuesta.__enter__.return_value.read.return_value = (
            b'{"id": 22, "username": "auxiliar", "rol": "auxiliar"}'
        )
        auxiliar = self.client.get("/auditoria/")
        self.assertEqual(auxiliar.status_code, status.HTTP_403_FORBIDDEN)

        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-admin")
        respuesta.__enter__.return_value.read.return_value = (
            b'{"id": 17, "username": "administradora", "rol": "administrador"}'
        )
        administrador = self.client.get("/auditoria/")
        borrar = self.client.delete(f"/auditoria/{evento.id}/")

        self.assertEqual(administrador.status_code, status.HTTP_200_OK)
        self.assertEqual(len(administrador.data), 1)
        self.assertEqual(
            borrar.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(
            RegistroAuditoria.objects.filter(pk=evento.pk).exists()
        )

    def test_lote_edita_metadatos_pero_no_cantidades(self):
        creado = self.crear_lote()
        self.assertEqual(creado.status_code, status.HTTP_201_CREATED)
        lote_id = creado.data["id"]

        editar = self.client.patch(
            f"/lotes/{lote_id}/",
            {"precio_venta": "9.25"},
            format="json",
        )
        alterar_stock = self.client.patch(
            f"/lotes/{lote_id}/",
            {"cantidad_actual": 1},
            format="json",
        )
        lote = Lote.objects.get(pk=lote_id)

        self.assertEqual(editar.status_code, status.HTTP_200_OK)
        self.assertEqual(alterar_stock.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(lote.precio_venta, Decimal("9.25"))
        self.assertEqual(lote.cantidad_actual, 8)
        self.assertEqual(
            MovimientoInventario.objects.filter(lote=lote).count(),
            1,
        )

    def test_lote_no_se_desactiva_con_stock_disponible(self):
        creado = self.crear_lote()
        lote_id = creado.data["id"]

        respuesta = self.client.patch(
            f"/lotes/{lote_id}/",
            {"activo": False},
            format="json",
        )

        lote = Lote.objects.get(pk=lote_id)
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(lote.activo)
        self.assertEqual(lote.cantidad_actual, 8)

    def test_no_crea_lote_vencido_ni_para_medicamento_inactivo(self):
        fecha_vencida = (
            timezone.localdate() - timedelta(days=1)
        ).isoformat()
        lote_vencido = self.crear_lote(
            numero_lote="LOTE-VENCIDO-CAT",
            fecha_vencimiento=fecha_vencida,
        )
        self.medicamento.activo = False
        self.medicamento.save(update_fields=["activo"])
        lote_inactivo = self.crear_lote(
            numero_lote="LOTE-MED-INACTIVO",
        )

        self.assertEqual(
            lote_vencido.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            lote_inactivo.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(Lote.objects.count(), 0)