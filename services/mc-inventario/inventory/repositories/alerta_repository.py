import re
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
    def obtener_alerta_vencimiento(medicamento, mensaje=None, numero_lote=None):
        queryset = Alerta.objects.filter(
            medicamento=medicamento,
            tipo="vencimiento",
            leida=False,
        )
        if numero_lote:
            alerta = queryset.filter(
                mensaje__startswith=f"El lote {numero_lote} "
            ).order_by("-fecha_creacion").first()
            if alerta:
                return alerta

        if mensaje:
            match = re.search(r"El lote (\S+) del medicamento", mensaje)
            if match:
                lote_num = match.group(1)
                alerta = queryset.filter(
                    mensaje__startswith=f"El lote {lote_num} "
                ).order_by("-fecha_creacion").first()
                if alerta:
                    return alerta
            return queryset.filter(mensaje=mensaje).first()

        return queryset.order_by("-fecha_creacion").first()

    @staticmethod
    def obtener_alertas_vencimiento_pendientes_lote(medicamento, numero_lote):
        return Alerta.objects.filter(
            medicamento=medicamento,
            tipo="vencimiento",
            leida=False,
            mensaje__startswith=f"El lote {numero_lote} ",
        ).order_by("-fecha_creacion")

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