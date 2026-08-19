from django.core.exceptions import ValidationError

from inventory.models import MovimientoInventario


class MovimientoValidator:

    @staticmethod
    def validar_cantidad(cantidad):
        if cantidad <= 0:
            raise ValidationError(
                "La cantidad debe ser mayor a cero."
            )

    @staticmethod
    def validar_stock(lote, cantidad):
        if cantidad > lote.cantidad_actual:
            raise ValidationError(
                "No existe stock suficiente."
            )

    @staticmethod
    def validar_referencia_unica(referencia):
        if not referencia:
            return

        referencia_normalizada = referencia.strip()

        if MovimientoInventario.objects.filter(
            referencia__iexact=referencia_normalizada
        ).exists():
            raise ValidationError(
                "Ya existe un movimiento con esta referencia."
            )