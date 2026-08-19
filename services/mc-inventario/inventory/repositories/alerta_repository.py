from inventory.models import Alerta


class AlertaRepository:

    @staticmethod
    def obtener_alerta_stock(medicamento):
        return Alerta.objects.filter(
            medicamento=medicamento,
            tipo="stock",
            leida=False,
        ).first()

    @staticmethod
    def crear_alerta_stock(
        medicamento,
        mensaje,
    ):
        return Alerta.objects.create(
            medicamento=medicamento,
            tipo="stock",
            mensaje=mensaje,
        )

    @staticmethod
    def obtener_alerta_vencimiento(medicamento, mensaje):
        return Alerta.objects.filter(
            medicamento=medicamento,
            tipo="vencimiento",
            mensaje=mensaje,
            leida=False,
        ).first()

    @staticmethod
    def crear_alerta_vencimiento(
        medicamento,
        mensaje,
    ):
        return Alerta.objects.create(
            medicamento=medicamento,
            tipo="vencimiento",
            mensaje=mensaje,
        )