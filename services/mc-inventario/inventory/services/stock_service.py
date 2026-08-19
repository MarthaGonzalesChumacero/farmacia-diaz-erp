from inventory.models import Lote

from inventory.repositories.alerta_repository import (
    AlertaRepository,
)


class StockService:

    @staticmethod
    def verificar_stock_minimo(lote: Lote):

        if lote.cantidad_actual <= lote.medicamento.stock_minimo:

            alerta = (
                AlertaRepository.obtener_alerta_stock(
                    lote.medicamento
                )
            )

            if not alerta:

                AlertaRepository.crear_alerta_stock(
                    medicamento=lote.medicamento,
                    mensaje=(
                        f"Stock crítico: "
                        f"{lote.medicamento.nombre} "
                        f"tiene "
                        f"{lote.cantidad_actual} unidades."
                    ),
                )

            return {
                "alerta": True,
                "mensaje": "Stock crítico.",
            }

        return {
            "alerta": False,
            "mensaje": "Stock suficiente.",
        }