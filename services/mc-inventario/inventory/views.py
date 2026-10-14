from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import date, datetime
from decimal import Decimal
from django.db import transaction

from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response

from .models import (
    Alerta,
    Categoria,
    Laboratorio,
    Lote,
    Medicamento,
    MovimientoInventario,
    Proveedor,
    RegistroAuditoria,
)

from .serializers import (
    AlertaSerializer,
    CategoriaSerializer,
    LaboratorioSerializer,
    LoteSerializer,
    MedicamentoSerializer,
    MovimientoInventarioSerializer,
    ProveedorSerializer,
    RegistroAuditoriaSerializer,
)

from .services.auditoria_service import AuditoriaService
from .services.movimiento_service import MovimientoService
from .services.reporte_service import ReporteService
from .services.vencimiento_service import VencimientoService


class VentaInventarioDetalleSerializer(serializers.Serializer):
    medicamento_id = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1)


class VentaInventarioSerializer(serializers.Serializer):
    referencia = serializers.CharField(max_length=50)
    detalles = VentaInventarioDetalleSerializer(
        many=True,
        allow_empty=False,
    )


class ReporteMovimientosParamsSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(
        choices=[opcion[0] for opcion in MovimientoInventario.TIPOS_MOVIMIENTO],
        required=False,
    )
    medicamento = serializers.IntegerField(min_value=1, required=False)
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)

    def validate(self, attrs):
        desde = attrs.get("desde")
        hasta = attrs.get("hasta")
        if desde and hasta and desde > hasta:
            raise serializers.ValidationError(
                {"desde": "La fecha inicial no puede ser posterior a la final."}
            )
        return attrs


class AlertaEstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alerta
        fields = ("leida",)


def obtener_actor_request(request):
    actor = getattr(request, "inventario_actor", None)
    if actor is None:
        actor = AuditoriaService._obtener_actor(request)
        request.inventario_actor = actor
    return actor


class UsuarioERPActivo(BasePermission):
    def has_permission(self, request, view):
        actor_id, _, rol = obtener_actor_request(request)
        return bool(
            actor_id
            and rol in ("administrador", "auxiliar")
        )


class AdministradorERP(UsuarioERPActivo):
    def has_permission(self, request, view):
        actor_id, _, rol = obtener_actor_request(request)
        return bool(actor_id and rol == "administrador")


class AdministradorOConsultaERP(UsuarioERPActivo):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return super().has_permission(request, view)
        return AdministradorERP().has_permission(request, view)


class AuditoriaMixin:
    entidad_auditoria = "registro"

    @staticmethod
    def _json_auditoria(valor):
        if hasattr(valor, "pk"):
            return valor.pk
        if isinstance(valor, (date, datetime)):
            return valor.isoformat()
        if isinstance(valor, Decimal):
            return str(valor)
        if isinstance(valor, (str, int, float, bool)) or valor is None:
            return valor
        return str(valor)

    def perform_create(self, serializer):
        instancia = serializer.save()
        AuditoriaService.registrar(
            request=self.request,
            accion="crear",
            entidad=self.entidad_auditoria,
            entidad_id=instancia.pk,
            referencia=getattr(instancia, "referencia", ""),
            detalles=dict(serializer.data),
        )


    def perform_update(self, serializer):
        instancia = serializer.instance
        antes = {
            campo: self._json_auditoria(getattr(instancia, campo))
            for campo in serializer.validated_data
        }
        instancia = serializer.save()
        despues = {
            campo: self._json_auditoria(getattr(instancia, campo))
            for campo in serializer.validated_data
        }
        accion = "actualizar"
        if antes.get("activo") is True and despues.get("activo") is False:
            accion = "desactivar"
        elif antes.get("activo") is False and despues.get("activo") is True:
            accion = "activar"
        AuditoriaService.registrar(
            request=self.request,
            accion=accion,
            entidad=self.entidad_auditoria,
            entidad_id=instancia.pk,
            referencia=getattr(instancia, "referencia", ""),
            detalles={
                campo: {"antes": antes[campo], "despues": despues[campo]}
                for campo in antes
            },
        )


class IsAdministradorDeAuditoria(BasePermission):
    def has_permission(self, request, view):
        _, _, rol = AuditoriaService._obtener_actor(request)
        return rol == "administrador"


class CategoriaViewSet(AuditoriaMixin, viewsets.ModelViewSet):
    permission_classes = (AdministradorOConsultaERP,)
    entidad_auditoria = "categoria"
    queryset = Categoria.objects.all().order_by("nombre")
    serializer_class = CategoriaSerializer
    filterset_fields = ["activo"]


class LaboratorioViewSet(AuditoriaMixin, viewsets.ModelViewSet):
    permission_classes = (AdministradorOConsultaERP,)
    entidad_auditoria = "laboratorio"
    queryset = Laboratorio.objects.all().order_by("nombre")
    serializer_class = LaboratorioSerializer
    filterset_fields = ["activo"]


class ProveedorViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    entidad_auditoria = "proveedor"
    permission_classes = (AdministradorOConsultaERP,)
    queryset = Proveedor.objects.all().order_by("nombre")
    serializer_class = ProveedorSerializer
    filterset_fields = ["activo"]
    search_fields = ["nombre", "contacto", "telefono", "email"]


class MedicamentoViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    entidad_auditoria = "medicamento"
    permission_classes = (AdministradorOConsultaERP,)
    queryset = Medicamento.objects.all().order_by("nombre")
    serializer_class = MedicamentoSerializer

    filterset_fields = [
        "categoria",
        "laboratorio",
        "activo",
        "codigo_barras",
    ]

    search_fields = [
        "nombre",
        "principio_activo",
        "codigo_barras",
    ]


class LoteViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    entidad_auditoria = "lote"
    permission_classes = (AdministradorOConsultaERP,)
    queryset = Lote.objects.all().order_by("fecha_vencimiento")
    serializer_class = LoteSerializer

    filterset_fields = [
        "medicamento",
        "activo",
    ]

    def _rechazar_cambios_de_stock(self, request):
        campos_protegidos = {
            "cantidad_actual",
            "cantidad_inicial",
        }.intersection(request.data.keys())
        if campos_protegidos:
            raise ValidationError(
                {
                    campo: "El stock solo puede cambiarse mediante movimientos de inventario."
                    for campo in campos_protegidos
                }
            )

    def update(self, request, *args, **kwargs):
        self._rechazar_cambios_de_stock(request)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._rechazar_cambios_de_stock(request)
        return super().partial_update(request, *args, **kwargs)

    @transaction.atomic
    def perform_create(self, serializer):
        lote = serializer.save(cantidad_actual=0)
        if lote.cantidad_inicial:
            MovimientoService.registrar_movimiento(
                lote=lote,
                tipo="entrada",
                cantidad=lote.cantidad_inicial,
                motivo="Stock inicial al registrar lote",
                referencia=f"LOTE-{lote.id}-INICIAL",
            )
        AuditoriaService.registrar(
            request=self.request,
            accion="crear",
            entidad="lote",
            entidad_id=lote.pk,
            referencia=f"LOTE-{lote.id}-INICIAL",
            detalles={
                "medicamento_id": lote.medicamento_id,
                "proveedor_id": lote.proveedor_id,
                "numero_lote": lote.numero_lote,
                "cantidad_inicial": lote.cantidad_inicial,
            },
        )


class MovimientoInventarioViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = MovimientoInventario.objects.all().order_by(
        "-fecha_movimiento"
    )
    serializer_class = MovimientoInventarioSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "registrar_venta"):
            return [UsuarioERPActivo()]
        return [AdministradorERP()]

    filterset_fields = [
        "tipo",
        "lote",
    ]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as error:
            referencia_error = error.detail.get("referencia")

            if referencia_error:
                mensaje = str(referencia_error[0])

                raise ValidationError(
                    {
                        "detalle": mensaje
                    }
                )

            raise

        datos = serializer.validated_data

        try:
            movimiento = MovimientoService.registrar_movimiento(
                lote=datos["lote"],
                tipo=datos["tipo"],
                cantidad=datos["cantidad"],
                motivo=datos.get("motivo", ""),
                referencia=datos.get("referencia", ""),
            )
        except DjangoValidationError as error:
            mensaje = (
                error.messages[0]
                if hasattr(error, "messages")
                else str(error)
            )

            raise ValidationError(
                {
                    "detalle": mensaje
                }
            )

        respuesta = self.get_serializer(movimiento)
        AuditoriaService.registrar(
            request=request,
            accion=movimiento.tipo,
            entidad="movimiento",
            entidad_id=movimiento.pk,
            referencia=movimiento.referencia,
            detalles={
                "lote_id": movimiento.lote_id,
                "cantidad": movimiento.cantidad,
                "stock_resultante": movimiento.stock_resultante,
                "motivo": movimiento.motivo,
            },
        )

        return Response(
            respuesta.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="registrar-venta",
    )
    def registrar_venta(self, request):
        serializer = VentaInventarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            movimientos = MovimientoService.registrar_venta(
                referencia=serializer.validated_data["referencia"],
                detalles=serializer.validated_data["detalles"],
            )
        except DjangoValidationError as error:
            mensaje = (
                error.messages[0]
                if hasattr(error, "messages")
                else str(error)
            )
            raise ValidationError({"detalle": mensaje})

        AuditoriaService.registrar(
            request=request,
            accion="venta_descuento",
            entidad="venta",
            referencia=serializer.validated_data["referencia"],
            detalles={
                "movimientos": [movimiento.pk for movimiento in movimientos],
            },
        )

        return Response(
            MovimientoInventarioSerializer(
                movimientos,
                many=True,
            ).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="reporte-kardex",
    )
    def reporte_kardex(self, request):
        parametros = ReporteMovimientosParamsSerializer(
            data=request.query_params
        )
        parametros.is_valid(raise_exception=True)
        resultado = ReporteService.obtener_reporte_movimientos(
            tipo=parametros.validated_data.get("tipo"),
            medicamento_id=parametros.validated_data.get("medicamento"),
            desde=parametros.validated_data.get("desde"),
            hasta=parametros.validated_data.get("hasta"),
        )

        return Response(
            resultado,
            status=status.HTTP_200_OK,
        )


class AlertaViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Alerta.objects.all().order_by("-fecha_creacion")
    serializer_class = AlertaSerializer

    def get_permissions(self):
        if self.action in (
            "list",
            "retrieve",
            "reporte_vencimientos",
            "reporte_stock_critico",
        ):
            return [UsuarioERPActivo()]
        return [AdministradorERP()]

    filterset_fields = [
        "tipo",
        "leida",
        "medicamento",
    ]

    @action(
        detail=True,
        methods=["patch"],
        url_path="estado",
    )
    def estado(self, request, pk=None):
        alerta = self.get_object()
        leida_anteriormente = alerta.leida
        serializer = AlertaEstadoSerializer(
            alerta,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        AuditoriaService.registrar(
            request=request,
            accion="marcar_revisada" if alerta.leida else "reabrir",
            entidad="alerta",
            entidad_id=alerta.pk,
            detalles={"leida_antes": leida_anteriormente, "leida": alerta.leida},
        )
        return Response(
            {
                "id": alerta.id,
                "leida": alerta.leida,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="verificar-vencimientos",
    )
    def verificar_vencimientos(self, request):
        resultado = (
            VencimientoService.generar_alertas_vencimiento(
                dias=30
            )
        )

        return Response(
            {
                "mensaje": (
                    "Verificación de vencimientos completada."
                ),
                "resultado": resultado,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="reporte-stock-critico",
    )
    def reporte_stock_critico(self, request):
        resultado = (
            ReporteService.obtener_reporte_stock_critico()
        )

        return Response(
            resultado,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="reporte-vencimientos",
    )
    def reporte_vencimientos(self, request):
        try:
            dias = int(request.query_params.get("dias", 30))
        except (TypeError, ValueError):
            raise ValidationError({"dias": "Debe ser un número entero."})
        if dias < 0 or dias > 3650:
            raise ValidationError({"dias": "Debe estar entre 0 y 3650."})
        resultado = (
            ReporteService.obtener_reporte_vencimientos(dias=dias)
        )

        return Response(
            resultado,
            status=status.HTTP_200_OK,
        )


class RegistroAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RegistroAuditoria.objects.all()
    serializer_class = RegistroAuditoriaSerializer
    filterset_fields = ("accion", "entidad", "actor_id")
    permission_classes = (AdministradorERP,)