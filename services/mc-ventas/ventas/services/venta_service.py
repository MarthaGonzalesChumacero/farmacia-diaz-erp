from decimal import Decimal

from django.db import transaction

from ..clients.inventario_client import InventarioClient
from ..repositories.detalle_venta_repository import (
    DetalleVentaRepository,
)
from ..repositories.venta_repository import VentaRepository


class VentaService:

    @staticmethod
    @transaction.atomic
    def crear_venta(datos_venta, detalles_data):
        referencia = datos_venta.get('referencia')

        venta = VentaRepository.crear(
            referencia=referencia,
            estado=datos_venta.get('estado', 'pendiente'),
            observacion=datos_venta.get('observacion', ''),
            total=Decimal('0.00'),
        )

        total = Decimal('0.00')

        for detalle in detalles_data:
            medicamento_id = detalle['medicamento_id']
            cantidad = detalle['cantidad']
            precio_unitario = detalle['precio_unitario']

            # Consultar los lotes disponibles en mc-inventario
            lotes = InventarioClient.obtener_lotes_por_medicamento(
                medicamento_id
            )

            if not lotes:
                raise ValueError(
                    f'No existe stock disponible para el medicamento '
                    f'{medicamento_id}.'
                )

            # Por ahora usamos el primer lote disponible
            lote = lotes[0]

            stock_actual = lote.get('cantidad_actual', 0)

            if stock_actual < cantidad:
                raise ValueError(
                    f'Stock insuficiente para el medicamento '
                    f'{medicamento_id}. '
                    f'Disponible: {stock_actual}. '
                    f'Solicitado: {cantidad}.'
                )

            subtotal = Decimal(cantidad) * precio_unitario

            # Registrar la salida en mc-inventario
            InventarioClient.registrar_salida(
                lote_id=lote['id'],
                cantidad=cantidad,
                referencia=f'{referencia}-MED-{medicamento_id}',
                motivo=f'Venta {referencia}',
            )

            # Registrar el detalle en mc-ventas
            DetalleVentaRepository.crear(
                venta=venta,
                medicamento_id=medicamento_id,
                medicamento_nombre=detalle['medicamento_nombre'],
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                subtotal=subtotal,
            )

            total += subtotal

        venta.total = total

        VentaRepository.guardar(venta)

        return venta