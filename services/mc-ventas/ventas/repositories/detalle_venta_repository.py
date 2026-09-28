from ..models import DetalleVenta


class DetalleVentaRepository:

    @staticmethod
    def crear(**datos):
        return DetalleVenta.objects.create(**datos)

    @staticmethod
    def listar_por_venta(venta):
        return DetalleVenta.objects.filter(
            venta=venta
        ).order_by('id')