from django.utils import timezone

from inventory.repositories.reporte_repository import (
    ReporteRepository,
)


class ReporteService:

    @staticmethod
    def obtener_reporte_stock_critico():
        lotes = ReporteRepository.obtener_stock_critico()

        reporte = []

        for lote in lotes:
            reporte.append(
                {
                    "medicamento_id": lote.medicamento.id,
                    "medicamento": lote.medicamento.nombre,
                    "numero_lote": lote.numero_lote,
                    "stock_actual": lote.cantidad_actual,
                    "stock_minimo": lote.medicamento.stock_minimo,
                    "fecha_vencimiento": lote.fecha_vencimiento,
                }
            )

        return {
            "total_registros": len(reporte),
            "resultados": reporte,
        }

    @staticmethod
    def obtener_reporte_vencimientos(dias=30):
        hoy = timezone.now().date()

        lotes = ReporteRepository.obtener_lotes_por_vencer(
            dias
        )

        reporte = []

        for lote in lotes:
            dias_restantes = (
                lote.fecha_vencimiento - hoy
            ).days

            reporte.append(
                {
                    "medicamento_id": lote.medicamento.id,
                    "medicamento": lote.medicamento.nombre,
                    "numero_lote": lote.numero_lote,
                    "fecha_vencimiento": lote.fecha_vencimiento,
                    "dias_restantes": dias_restantes,
                    "stock_actual": lote.cantidad_actual,
                }
            )

        return {
            "total_registros": len(reporte),
            "resultados": reporte,
        }

    @staticmethod
    def obtener_reporte_kardex():
        movimientos = ReporteRepository.obtener_kardex()

        reporte = []

        for movimiento in movimientos:
            reporte.append(
                {
                    "movimiento_id": movimiento.id,
                    "fecha_movimiento": movimiento.fecha_movimiento,
                    "medicamento_id": (
                        movimiento.lote.medicamento.id
                    ),
                    "medicamento": (
                        movimiento.lote.medicamento.nombre
                    ),
                    "numero_lote": movimiento.lote.numero_lote,
                    "tipo": movimiento.tipo,
                    "tipo_descripcion": (
                        movimiento.get_tipo_display()
                    ),
                    "cantidad": movimiento.cantidad,
                    "stock_resultante": (
                        movimiento.stock_resultante
                    ),
                    "motivo": movimiento.motivo,
                    "referencia": movimiento.referencia,
                }
            )

        return {
            "total_registros": len(reporte),
            "resultados": reporte,
        }