from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

from ..clients.inventario_client import InventarioClient
from ..models import Venta
from ..repositories.detalle_venta_repository import (
    DetalleVentaRepository,
)
from ..repositories.venta_repository import VentaRepository


class VentaService:

    @staticmethod
    def crear_venta(datos_venta, detalles_data, authorization=None):
        referencia = datos_venta.get('referencia')
        total = sum(
            (
                Decimal(detalle['cantidad'])
                * detalle['precio_unitario']
                for detalle in detalles_data
            ),
            Decimal('0.00'),
        )

        try:
            with transaction.atomic():
                venta = VentaRepository.obtener_por_referencia(
                    referencia
                )
                if venta is None:
                    venta = VentaRepository.crear(
                        referencia=referencia,
                        estado='pendiente',
                        observacion=datos_venta.get('observacion', ''),
                        total=total,
                    )
                    for detalle in detalles_data:
                        subtotal = (
                            Decimal(detalle['cantidad'])
                            * detalle['precio_unitario']
                        )
                        DetalleVentaRepository.crear(
                            venta=venta,
                            medicamento_id=detalle['medicamento_id'],
                            medicamento_nombre=detalle['medicamento_nombre'],
                            cantidad=detalle['cantidad'],
                            precio_unitario=detalle['precio_unitario'],
                            subtotal=subtotal,
                        )
                else:
                    VentaService._validar_reintento(
                        venta,
                        detalles_data,
                        datos_venta.get('observacion', ''),
                    )

        except IntegrityError:
            venta = VentaRepository.obtener_por_referencia(referencia)
            if venta is None:
                raise
            VentaService._validar_reintento(
                venta,
                detalles_data,
                datos_venta.get('observacion', ''),
            )

        if venta.estado == 'completada':
            return venta
        if venta.estado == 'anulada':
            raise ValidationError(
                {'referencia': 'No se puede reintentar una venta anulada.'}
            )

        cantidades_por_medicamento = {}
        for detalle in detalles_data:
            medicamento_id = detalle['medicamento_id']
            cantidades_por_medicamento[medicamento_id] = (
                cantidades_por_medicamento.get(medicamento_id, 0)
                + detalle['cantidad']
            )

        parametros_inventario = {
            'referencia': referencia,
            'detalles': [
                {
                    'medicamento_id': medicamento_id,
                    'cantidad': cantidad,
                }
                for medicamento_id, cantidad
                in cantidades_por_medicamento.items()
            ],
        }
        if authorization:
            parametros_inventario['authorization'] = authorization
        InventarioClient.registrar_venta(**parametros_inventario)

        with transaction.atomic():
            venta = Venta.objects.select_for_update().get(pk=venta.pk)
            venta.estado = 'completada'
            VentaRepository.guardar(venta)

        return venta

    @staticmethod
    def _validar_reintento(venta, detalles_data, observacion):
        detalles_existentes = list(
            venta.detalles.order_by('id').values(
                'medicamento_id',
                'medicamento_nombre',
                'cantidad',
                'precio_unitario',
            )
        )
        payload_existente = [
            {
                'medicamento_id': detalle['medicamento_id'],
                'medicamento_nombre': detalle['medicamento_nombre'],
                'cantidad': detalle['cantidad'],
                'precio_unitario': Decimal(detalle['precio_unitario']),
            }
            for detalle in detalles_existentes
        ]
        payload_nuevo = [
            {
                'medicamento_id': detalle['medicamento_id'],
                'medicamento_nombre': detalle['medicamento_nombre'],
                'cantidad': detalle['cantidad'],
                'precio_unitario': Decimal(detalle['precio_unitario']),
            }
            for detalle in detalles_data
        ]

        if (
            payload_existente != payload_nuevo
            or venta.observacion != observacion
        ):
            raise ValidationError(
                {'referencia': 'La referencia ya pertenece a otra venta.'}
            )