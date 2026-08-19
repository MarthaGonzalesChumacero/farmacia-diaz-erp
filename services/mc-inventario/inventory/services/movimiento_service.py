from django.core.exceptions import ValidationError
from django.db import transaction

from inventory.repositories.lote_repository import LoteRepository
from inventory.repositories.movimiento_repository import (
    MovimientoRepository,
)
from inventory.services.stock_service import StockService
from inventory.validators.movimiento_validator import (
    MovimientoValidator,
)


class MovimientoService:

    @staticmethod
    @transaction.atomic
    def registrar_movimiento(
        lote,
        tipo,
        cantidad,
        motivo="",
        referencia="",
    ):
        MovimientoValidator.validar_cantidad(cantidad)

        MovimientoValidator.validar_referencia_unica(
            referencia
        )

        if tipo in (
            "entrada",
            "ajuste_entrada",
            "devolucion",
        ):
            lote.cantidad_actual += cantidad

        elif tipo in (
            "salida",
            "ajuste_salida",
            "vencimiento",
        ):
            MovimientoValidator.validar_stock(
                lote,
                cantidad,
            )

            lote.cantidad_actual -= cantidad

        else:
            raise ValidationError(
                "El tipo de movimiento no es válido."
            )

        LoteRepository.guardar(lote)

        movimiento = MovimientoRepository.crear(
            lote=lote,
            tipo=tipo,
            cantidad=cantidad,
            motivo=motivo,
            referencia=referencia.strip(),
        )

        alerta = StockService.verificar_stock_minimo(lote)

        if alerta["alerta"]:
            print(alerta["mensaje"])

        return movimiento