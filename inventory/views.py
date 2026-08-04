from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import (
    Alerta,
    Categoria,
    Laboratorio,
    Lote,
    Medicamento,
    MovimientoInventario,
)

from .serializers import (
    AlertaSerializer,
    CategoriaSerializer,
    LaboratorioSerializer,
    LoteSerializer,
    MedicamentoSerializer,
    MovimientoInventarioSerializer,
)

from .services.movimiento_service import MovimientoService
from .services.reporte_service import ReporteService
from .services.vencimiento_service import VencimientoService


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all().order_by("nombre")
    serializer_class = CategoriaSerializer
    filterset_fields = ["activo"]


class LaboratorioViewSet(viewsets.ModelViewSet):
    queryset = Laboratorio.objects.all().order_by("nombre")
    serializer_class = LaboratorioSerializer
    filterset_fields = ["activo"]


class MedicamentoViewSet(viewsets.ModelViewSet):
    queryset = Medicamento.objects.all().order_by("nombre")
    serializer_class = MedicamentoSerializer

    filterset_fields = [
        "categoria",
        "laboratorio",
        "activo",
    ]

    search_fields = [
        "nombre",
        "principio_activo",
        "codigo_barras",
    ]


class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.all().order_by("fecha_vencimiento")
    serializer_class = LoteSerializer

    filterset_fields = [
        "medicamento",
        "activo",
    ]


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

        return Response(
            respuesta.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="reporte-kardex",
    )
    def reporte_kardex(self, request):
        resultado = ReporteService.obtener_reporte_kardex()

        return Response(
            resultado,
            status=status.HTTP_200_OK,
        )


class AlertaViewSet(viewsets.ModelViewSet):
    queryset = Alerta.objects.all().order_by("-fecha_creacion")
    serializer_class = AlertaSerializer

    filterset_fields = [
        "tipo",
        "leida",
        "medicamento",
    ]

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
        resultado = (
            ReporteService.obtener_reporte_vencimientos()
        )

        return Response(
            resultado,
            status=status.HTTP_200_OK,
        )