from django.utils import timezone

from inventory.repositories.reporte_repository import (
    ReporteRepository,
)


class ReporteService:

    @staticmethod
    def obtener_reporte_stock_critico():
        medicamentos = ReporteRepository.obtener_stock_critico()

        reporte = []

        for medicamento in medicamentos:
            reporte.append(
                {
                    "medicamento_id": medicamento.id,
                    "medicamento": medicamento.nombre,
                    "stock_actual": medicamento.stock_actual,
                    "stock_minimo": medicamento.stock_minimo,
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
        return ReporteService._serializar_movimientos(movimientos)

    @staticmethod
    def obtener_reporte_movimientos(
        tipo=None,
        medicamento_id=None,
        desde=None,
        hasta=None,
    ):
        movimientos = ReporteRepository.obtener_kardex()
        if tipo:
            movimientos = movimientos.filter(tipo=tipo)
        if medicamento_id:
            movimientos = movimientos.filter(
                lote__medicamento_id=medicamento_id
            )
        if desde:
            movimientos = movimientos.filter(
                fecha_movimiento__date__gte=desde
            )
        if hasta:
            movimientos = movimientos.filter(
                fecha_movimiento__date__lte=hasta
            )
        return ReporteService._serializar_movimientos(movimientos)

    @staticmethod
    def _serializar_movimientos(movimientos):

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