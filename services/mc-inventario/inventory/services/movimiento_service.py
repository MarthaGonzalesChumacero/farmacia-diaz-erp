from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from uuid import uuid4

from inventory.models import Lote, MovimientoInventario
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
    def registrar_venta(referencia, detalles):
        referencia = referencia.strip().upper()
        if not referencia:
            raise ValidationError("La referencia de venta es obligatoria.")

        cantidades = {}
        for detalle in detalles:
            medicamento_id = int(detalle["medicamento_id"])
            cantidad = int(detalle["cantidad"])
            if cantidad <= 0:
                raise ValidationError("La cantidad debe ser mayor a cero.")
            cantidades[medicamento_id] = (
                cantidades.get(medicamento_id, 0) + cantidad
            )

        prefijo = f"V:{referencia}:"

        def movimientos_existentes():
            movimientos = list(
                MovimientoInventario.objects.filter(
                    referencia__startswith=prefijo
                ).select_related("lote", "lote__medicamento")
            )
            if not movimientos:
                return None

            cantidades_registradas = {}
            for movimiento in movimientos:
                if movimiento.tipo != "salida":
                    raise ValidationError(
                        "La referencia de venta ya fue utilizada."
                    )
                medicamento_id = movimiento.lote.medicamento_id
                cantidades_registradas[medicamento_id] = (
                    cantidades_registradas.get(medicamento_id, 0)
                    + movimiento.cantidad
                )

            if cantidades_registradas != cantidades:
                raise ValidationError(
                    "La referencia ya existe con otros medicamentos o cantidades."
                )
            return movimientos

        existentes = movimientos_existentes()
        if existentes is not None:
            return existentes

        lotes = list(
            Lote.objects.select_for_update()
            .filter(
                medicamento_id__in=cantidades,
                medicamento__activo=True,
                activo=True,
                cantidad_actual__gt=0,
                fecha_vencimiento__gte=timezone.localdate(),
            )
            .select_related("medicamento")
            .order_by("fecha_vencimiento", "id")
        )

        # Another request with the same reference may have completed while
        # this request was waiting for the lot locks.
        existentes = movimientos_existentes()
        if existentes is not None:
            return existentes

        lotes_por_medicamento = {}
        for lote in lotes:
            lotes_por_medicamento.setdefault(
                lote.medicamento_id, []
            ).append(lote)

        asignaciones = []
        for medicamento_id, cantidad_solicitada in cantidades.items():
            restante = cantidad_solicitada
            disponibles = lotes_por_medicamento.get(
                medicamento_id, []
            )
            stock_disponible = sum(
                lote.cantidad_actual for lote in disponibles
            )

            if stock_disponible < cantidad_solicitada:
                raise ValidationError(
                    f"Stock insuficiente para el medicamento {medicamento_id}. "
                    f"Disponible: {stock_disponible}. "
                    f"Solicitado: {cantidad_solicitada}."
                )

            for lote in disponibles:
                cantidad_lote = min(restante, lote.cantidad_actual)
                if cantidad_lote:
                    asignaciones.append((lote, cantidad_lote))
                    restante -= cantidad_lote
                if restante == 0:
                    break

        movimientos = []
        for lote, cantidad in asignaciones:
            lote.cantidad_actual -= cantidad
            lote.save(update_fields=["cantidad_actual"])

            movimiento = MovimientoRepository.crear(
                lote=lote,
                tipo="salida",
                cantidad=cantidad,
                motivo=f"Venta {referencia}",
                referencia=(
                    f"{prefijo}M:{lote.medicamento_id}:L:{lote.id}"
                ),
            )
            movimientos.append(movimiento)
            StockService.verificar_stock_minimo(lote)

        return movimientos

    @staticmethod
    @transaction.atomic
    def registrar_movimiento(
        lote,
        tipo,
        cantidad,
        motivo="",
        referencia="",
    ):
        lote = (
            Lote.objects.select_for_update()
            .select_related("medicamento")
            .get(pk=lote.pk)
        )
        MovimientoValidator.validar_cantidad(cantidad)

        if not lote.activo:
            raise ValidationError("No se puede mover stock de un lote inactivo.")

        if not motivo.strip():
            raise ValidationError("El motivo del movimiento es obligatorio.")

        if (
            tipo in ("entrada", "ajuste_entrada", "devolucion")
            and lote.fecha_vencimiento < timezone.localdate()
        ):
            raise ValidationError(
                "No se puede ingresar stock a un lote vencido."
            )

        if (
            tipo in ("entrada", "ajuste_entrada", "devolucion")
            and not lote.medicamento.activo
        ):
            raise ValidationError(
                "No se puede ingresar stock a un medicamento inactivo."
            )
        if tipo == "salida" and lote.fecha_vencimiento < timezone.localdate():
            raise ValidationError(
                "Usa el tipo vencimiento para dar de baja un lote vencido."
            )

        if tipo == "vencimiento" and lote.fecha_vencimiento >= timezone.localdate():
            raise ValidationError(
                "Solo se pueden dar de baja lotes que ya vencieron."
            )

        referencia = referencia.strip() or f"INV-{uuid4().hex.upper()}"

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