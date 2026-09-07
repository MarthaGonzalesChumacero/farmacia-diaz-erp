from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import DetalleVenta, Venta


class DetalleVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleVenta
        fields = [
            'id',
            'medicamento_id',
            'medicamento_nombre',
            'cantidad',
            'precio_unitario',
            'subtotal',
        ]

        read_only_fields = [
            'id',
            'subtotal',
        ]


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(
        many=True,
    )

    class Meta:
        model = Venta
        fields = [
            'id',
            'referencia',
            'fecha_venta',
            'total',
            'estado',
            'observacion',
            'detalles',
        ]

        read_only_fields = [
            'id',
            'fecha_venta',
            'total',
        ]

    def validate_detalles(self, detalles):
        if not detalles:
            raise serializers.ValidationError(
                'La venta debe tener al menos un medicamento.'
            )

        for detalle in detalles:
            if detalle['cantidad'] <= 0:
                raise serializers.ValidationError(
                    'La cantidad debe ser mayor a 0.'
                )

            if detalle['precio_unitario'] <= Decimal('0'):
                raise serializers.ValidationError(
                    'El precio unitario debe ser mayor a 0.'
                )

        return detalles

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')

        venta = Venta.objects.create(
            **validated_data
        )

        total = Decimal('0.00')

        for detalle_data in detalles_data:
            cantidad = detalle_data['cantidad']
            precio_unitario = detalle_data['precio_unitario']

            subtotal = (
                Decimal(cantidad)
                * precio_unitario
            )

            DetalleVenta.objects.create(
                venta=venta,
                subtotal=subtotal,
                **detalle_data
            )

            total += subtotal

        venta.total = total
        venta.save(
            update_fields=['total']
        )

        return venta