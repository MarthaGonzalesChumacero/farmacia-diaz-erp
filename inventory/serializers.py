from rest_framework import serializers

from .models import (
    Alerta,
    Categoria,
    Laboratorio,
    Lote,
    Medicamento,
    MovimientoInventario,
)


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = "__all__"


class LaboratorioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Laboratorio
        fields = "__all__"


class MedicamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicamento
        fields = "__all__"


class LoteSerializer(serializers.ModelSerializer):
    medicamento_nombre = serializers.CharField(
        source="medicamento.nombre",
        read_only=True,
    )

    class Meta:
        model = Lote
        fields = "__all__"


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    medicamento = serializers.CharField(
        source="lote.medicamento.nombre",
        read_only=True,
    )

    numero_lote = serializers.CharField(
        source="lote.numero_lote",
        read_only=True,
    )

    tipo_descripcion = serializers.CharField(
        source="get_tipo_display",
        read_only=True,
    )

    referencia = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[],
    )

    class Meta:
        model = MovimientoInventario

        fields = (
            "id",
            "medicamento",
            "numero_lote",
            "tipo_descripcion",
            "tipo",
            "cantidad",
            "motivo",
            "referencia",
            "lote",
            "stock_resultante",
            "fecha_movimiento",
        )

        read_only_fields = (
            "stock_resultante",
            "fecha_movimiento",
        )

    def validate_referencia(self, value):
        referencia = value.strip()

        if not referencia:
            return referencia

        if MovimientoInventario.objects.filter(
            referencia__iexact=referencia
        ).exists():
            raise serializers.ValidationError(
                "Ya existe un movimiento con esta referencia."
            )

        return referencia


class AlertaSerializer(serializers.ModelSerializer):
    medicamento_nombre = serializers.CharField(
        source="medicamento.nombre",
        read_only=True,
    )

    class Meta:
        model = Alerta
        fields = "__all__"