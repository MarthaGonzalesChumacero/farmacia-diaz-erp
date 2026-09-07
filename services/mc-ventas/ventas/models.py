from django.db import models


class Venta(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('completada', 'Completada'),
        ('anulada', 'Anulada'),
    ]

    referencia = models.CharField(
        max_length=50,
        unique=True,
    )

    fecha_venta = models.DateTimeField(
        auto_now_add=True,
    )

    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='pendiente',
    )

    observacion = models.TextField(
        blank=True,
    )

    def __str__(self):
        return f"Venta {self.referencia}"


class DetalleVenta(models.Model):
    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        related_name='detalles',
    )

    medicamento_id = models.PositiveIntegerField()

    medicamento_nombre = models.CharField(
        max_length=200,
    )

    cantidad = models.PositiveIntegerField()

    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    def __str__(self):
        return (
            f"{self.medicamento_nombre} "
            f"x {self.cantidad}"
        )