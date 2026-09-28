from ..models import Venta


class VentaRepository:

    @staticmethod
    def listar():
        return Venta.objects.all().order_by('-fecha_venta')

    @staticmethod
    def obtener_por_id(venta_id):
        return Venta.objects.filter(
            id=venta_id
        ).first()

    @staticmethod
    def obtener_por_referencia(referencia):
        return Venta.objects.filter(
            referencia__iexact=referencia
        ).first()

    @staticmethod
    def crear(**datos):
        return Venta.objects.create(**datos)

    @staticmethod
    def guardar(venta):
        venta.save()
        return venta