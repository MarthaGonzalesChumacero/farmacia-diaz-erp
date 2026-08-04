from inventory.models import MovimientoInventario


class MovimientoRepository:

    @staticmethod
    def crear(
        lote,
        tipo,
        cantidad,
        motivo="",
        referencia="",
    ):
        return MovimientoInventario.objects.create(
            lote=lote,
            tipo=tipo,
            cantidad=cantidad,
            stock_resultante=lote.cantidad_actual,
            motivo=motivo,
            referencia=referencia,
        )