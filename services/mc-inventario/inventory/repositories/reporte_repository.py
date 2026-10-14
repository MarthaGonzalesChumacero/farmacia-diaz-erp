from datetime import timedelta

from django.db.models import F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from inventory.models import Lote, Medicamento, MovimientoInventario


class ReporteRepository:

    @staticmethod
    def obtener_stock_critico():
        return (
            Medicamento.objects.filter(activo=True)
            .annotate(
                stock_actual=Coalesce(
                    Sum(
                        "lotes__cantidad_actual",
                        filter=Q(
                            lotes__activo=True,
                            lotes__fecha_vencimiento__gte=(
                                timezone.localdate()
                            ),
                        ),
                    ),
                    0,
                )
            )
            .filter(stock_actual__lte=F("stock_minimo"))
            .order_by("nombre")
        )

    @staticmethod
    def obtener_lotes_por_vencer(dias=30):
        hoy = timezone.now().date()
        fecha_limite = hoy + timedelta(days=dias)

        return (
            Lote.objects.filter(
                activo=True,
                cantidad_actual__gt=0,
                fecha_vencimiento__gte=hoy,
                fecha_vencimiento__lte=fecha_limite,
            )
            .select_related("medicamento")
            .order_by("fecha_vencimiento")
        )

    @staticmethod
    def obtener_kardex():
        return (
            MovimientoInventario.objects
            .select_related(
                "lote",
                "lote__medicamento",
            )
            .order_by("-fecha_movimiento")
        )