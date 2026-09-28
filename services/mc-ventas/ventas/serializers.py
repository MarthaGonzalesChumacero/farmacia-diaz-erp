from rest_framework import serializers

from .models import DetalleVenta, Venta
from .services.venta_service import VentaService
from .validators.venta_validator import VentaValidator


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
        return VentaValidator.validar_detalles(detalles)

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')

        venta = VentaService.crear_venta(
            validated_data,
            detalles_data,
        )

        return venta