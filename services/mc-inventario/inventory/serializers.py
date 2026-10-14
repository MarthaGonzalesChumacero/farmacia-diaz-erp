from django.utils import timezone

from rest_framework import serializers

from .models import (
    Alerta,
    Categoria,
    Laboratorio,
    Lote,
    Medicamento,
    MovimientoInventario,
    Proveedor,
    RegistroAuditoria,
)


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = "__all__"


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = "__all__"
        read_only_fields = ("fecha_registro",)

    def validate_nombre(self, value):
        nombre = value.strip()
        existentes = Proveedor.objects.filter(nombre__iexact=nombre)
        if self.instance is not None:
            existentes = existentes.exclude(pk=self.instance.pk)
        if existentes.exists():
            raise serializers.ValidationError(
                "Ya existe un proveedor con este nombre."
            )
        return nombre


class LaboratorioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Laboratorio
        fields = "__all__"


class MedicamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicamento
        fields = "__all__"

    def validate_codigo_barras(self, value):
        codigo = value.strip()
        existentes = Medicamento.objects.filter(
            codigo_barras__iexact=codigo
        )
        if self.instance is not None:
            existentes = existentes.exclude(pk=self.instance.pk)
        if existentes.exists():
            raise serializers.ValidationError(
                "Ya existe un medicamento con este código de barras."
            )
        return codigo

    def validate(self, attrs):
        for campo in ("nombre", "principio_activo", "presentacion"):
            valor = attrs.get(campo)
            if valor is not None:
                attrs[campo] = valor.strip()
                if not attrs[campo]:
                    raise serializers.ValidationError(
                        {campo: "Este campo no puede estar vacío."}
                    )
        return attrs


class LoteSerializer(serializers.ModelSerializer):
    medicamento_nombre = serializers.CharField(
        source="medicamento.nombre",
        read_only=True,
    )
    proveedor_nombre = serializers.CharField(
        source="proveedor.nombre",
        read_only=True,
        allow_null=True,
    )


    class Meta:
        model = Lote
        fields = "__all__"
        read_only_fields = (
            "cantidad_actual",
            "fecha_ingreso",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            for campo in (
                "medicamento",
                "numero_lote",
                "cantidad_inicial",
            ):
                self.fields[campo].read_only = True

    def validate(self, attrs):
        hoy = timezone.localdate()
        medicamento = attrs.get(
            "medicamento",
            getattr(self.instance, "medicamento", None),
        )
        fecha_vencimiento = attrs.get(
            "fecha_vencimiento",
            getattr(self.instance, "fecha_vencimiento", None),
        )

        if self.instance is None:
            if medicamento is not None and not medicamento.activo:
                raise serializers.ValidationError(
                    {"medicamento": "No se pueden crear lotes para medicamentos inactivos."}
                )
            if fecha_vencimiento is not None and fecha_vencimiento < hoy:
                raise serializers.ValidationError(
                    {"fecha_vencimiento": "No se puede registrar un lote vencido."}
                )
            cantidad_inicial = attrs.get("cantidad_inicial", 0)
            if cantidad_inicial <= 0:
                raise serializers.ValidationError(
                    {"cantidad_inicial": "La cantidad inicial debe ser mayor a cero."}
                )
        elif (
            "fecha_vencimiento" in attrs
            and attrs["fecha_vencimiento"] < hoy
            and self.instance.cantidad_actual > 0
        ):
            raise serializers.ValidationError(
                {"fecha_vencimiento": "No se puede vencer un lote que todavía tiene stock."}
            )

        proveedor = attrs.get(
            "proveedor",
            getattr(self.instance, "proveedor", None),
        )
        proveedor_cambiado = (
            self.instance is None
            or proveedor is not None
            and proveedor.pk != self.instance.proveedor_id
        )
        if (
            proveedor is not None
            and not proveedor.activo
            and proveedor_cambiado
        ):
            raise serializers.ValidationError(
                {"proveedor": "No se puede asignar un proveedor inactivo."}
            )

        if (
            self.instance is not None
            and attrs.get("activo") is False
            and self.instance.cantidad_actual > 0
        ):
            raise serializers.ValidationError(
                {"activo": "Registra primero una salida o baja para dejar el lote sin stock."}
            )
        return attrs


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

    def validate_motivo(self, value):
        motivo = value.strip()
        if not motivo:
            raise serializers.ValidationError(
                "El motivo del movimiento es obligatorio."
            )
        return motivo


class AlertaSerializer(serializers.ModelSerializer):
    medicamento_nombre = serializers.CharField(
        source="medicamento.nombre",
        read_only=True,
    )

    class Meta:
        model = Alerta
        fields = "__all__"


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroAuditoria
        fields = "__all__"
        read_only_fields = (
            "accion",
            "entidad",
            "entidad_id",
            "actor_id",
            "actor_username",
            "referencia",
            "detalles",
            "direccion_ip",
            "user_agent",
            "fecha_evento",
        )