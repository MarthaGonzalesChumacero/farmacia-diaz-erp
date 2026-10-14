
from django.db.models import Sum
from django.utils import timezone

from inventory.models import Lote, Medicamento
from inventory.repositories.alerta_repository import (
    AlertaRepository,
)


class StockService:

    @staticmethod
    def calcular_stock_total(medicamento):
        resultado = Lote.objects.filter(
            medicamento=medicamento,
            activo=True,
            fecha_vencimiento__gte=timezone.localdate(),
        ).aggregate(
            total=Sum("cantidad_actual")
        )

        return resultado["total"] or 0

    @staticmethod
    def verificar_stock_minimo(lote: Lote):
        return StockService.verificar_stock_medicamento(
            lote.medicamento
        )

    @staticmethod
    def verificar_stock_medicamento(medicamento):
        stock_actual = StockService.calcular_stock_total(
            medicamento
        )

        stock_minimo = medicamento.stock_minimo

        if not medicamento.activo:
            return {
                "alerta": False,
                "mensaje": "Medicamento inactivo.",
            }

        if stock_actual <= stock_minimo:

            alerta_existente = (
                AlertaRepository.obtener_alerta_stock(
                    medicamento
                )
            )

            if stock_actual == 0:
                mensaje = (
                    f"Medicamento agotado: "
                    f"{medicamento.nombre} tiene "
                    f"0 unidades disponibles."
                )
            else:
                mensaje = (
                    f"Stock crítico: "
                    f"{medicamento.nombre} tiene "
                    f"{stock_actual} unidades. "
                    f"Stock mínimo: {stock_minimo}."
                )

            if not alerta_existente:
                AlertaRepository.crear_alerta_stock(
                    medicamento=medicamento,
                    mensaje=mensaje,
                )

            return {
                "alerta": True,
                "mensaje": mensaje,
            }

        return {
            "alerta": False,
            "mensaje": "Stock suficiente.",
        }

    @staticmethod
    def verificar_todos_los_medicamentos():
        medicamentos = Medicamento.objects.filter(
            activo=True
        )

        revisados = 0
        con_stock_bajo = 0

        for medicamento in medicamentos:
            resultado = (
                StockService.verificar_stock_medicamento(
                    medicamento
                )
            )

            revisados += 1

            if resultado["alerta"]:
                con_stock_bajo += 1

        return {
            "medicamentos_revisados": revisados,
            "medicamentos_con_stock_bajo": con_stock_bajo,
        }
