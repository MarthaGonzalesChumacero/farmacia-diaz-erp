from django.db import models


class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Laboratorio(models.Model):
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Medicamento(models.Model):

    UNIDADES_MEDIDA = [
        ('unidad', 'Unidad'),
        ('caja', 'Caja'),
        ('frasco', 'Frasco'),
        ('blister', 'Blíster'),
        ('sobre', 'Sobre'),
        ('tubo', 'Tubo'),
    ]

    nombre = models.CharField(max_length=150)
    principio_activo = models.CharField(max_length=150)
    presentacion = models.CharField(max_length=100)
    codigo_barras = models.CharField(max_length=50, unique=True)

    registro_sanitario = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    descripcion = models.TextField(blank=True)

    stock_minimo = models.PositiveIntegerField(default=0)

    unidad_medida = models.CharField(
        max_length=20,
        choices=UNIDADES_MEDIDA,
        default='unidad',
    )

    activo = models.BooleanField(default=True)

    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='medicamentos',
        blank=True,
        null=True,
    )

    laboratorio = models.ForeignKey(
        Laboratorio,
        on_delete=models.PROTECT,
        related_name='medicamentos',
        blank=True,
        null=True,
    )

    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


class Lote(models.Model):

    medicamento = models.ForeignKey(
        Medicamento,
        on_delete=models.PROTECT,
        related_name='lotes',
    )

    numero_lote = models.CharField(
        max_length=100,
    )

    fecha_vencimiento = models.DateField()

    cantidad_inicial = models.PositiveIntegerField()

    cantidad_actual = models.PositiveIntegerField()

    precio_compra = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    precio_venta = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    fecha_ingreso = models.DateTimeField(
        auto_now_add=True,
    )

    activo = models.BooleanField(
        default=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['medicamento', 'numero_lote'],
                name='lote_unico_por_medicamento',
            )
        ]

    def __str__(self):
        return f"{self.medicamento.nombre} - {self.numero_lote}"


class MovimientoInventario(models.Model):

    TIPOS_MOVIMIENTO = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
        ('ajuste_entrada', 'Ajuste de entrada'),
        ('ajuste_salida', 'Ajuste de salida'),
        ('vencimiento', 'Vencimiento'),
        ('devolucion', 'Devolución'),
    ]

    lote = models.ForeignKey(
        Lote,
        on_delete=models.PROTECT,
        related_name='movimientos',
    )

    tipo = models.CharField(
        max_length=20,
        choices=TIPOS_MOVIMIENTO,
    )

    cantidad = models.PositiveIntegerField()

    stock_resultante = models.PositiveIntegerField(
        default=0,
    )

    motivo = models.CharField(
        max_length=255,
        blank=True,
    )

    referencia = models.CharField(
    max_length=100,
    blank=True,
    unique=True,
    )

    fecha_movimiento = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return (
            f"{self.get_tipo_display()} - "
            f"{self.lote.numero_lote} - "
            f"{self.cantidad}"
        )
class Alerta(models.Model):

    TIPOS_ALERTA = [
        ("stock", "Stock crítico"),
        ("vencimiento", "Próximo a vencer"),
    ]

    medicamento = models.ForeignKey(
        Medicamento,
        on_delete=models.CASCADE,
        related_name="alertas",
    )

    tipo = models.CharField(
        max_length=20,
        choices=TIPOS_ALERTA,
    )

    mensaje = models.CharField(
        max_length=255,
    )

    leida = models.BooleanField(
        default=False,
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return (
            f"{self.medicamento.nombre} - "
            f"{self.get_tipo_display()}"
        )