from decimal import Decimal

from rest_framework import serializers


class VentaValidator:

    @staticmethod
    def validar_detalles(detalles):
        if not detalles:
            raise serializers.ValidationError(
                'La venta debe tener al menos un medicamento.'
            )

        for detalle in detalles:
            cantidad = detalle.get('cantidad')
            precio_unitario = detalle.get('precio_unitario')

            if cantidad is None or cantidad <= 0:
                raise serializers.ValidationError(
                    'La cantidad debe ser mayor a 0.'
                )

            if (
                precio_unitario is None
                or precio_unitario <= Decimal('0')
            ):
                raise serializers.ValidationError(
                    'El precio unitario debe ser mayor a 0.'
                )

        return detalles