from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from inventory.models import Lote, MovimientoInventario


class ReporteRepository:

    @staticmethod
    def obtener_stock_critico():
        return (
            Lote.objects.filter(
                activo=True,
                cantidad_actual__lte=F(
                    "medicamento__stock_minimo"
                ),
            )
            .select_related("medicamento")
            .order_by("medicamento__nombre")
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