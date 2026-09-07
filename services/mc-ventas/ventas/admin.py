from django.contrib import admin

from .models import DetalleVenta, Venta


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'referencia',
        'fecha_venta',
        'total',
        'estado',
    )

    search_fields = (
        'referencia',
    )

    list_filter = (
        'estado',
        'fecha_venta',
    )


@admin.register(DetalleVenta)
class DetalleVentaAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'venta',
        'medicamento_id',
        'medicamento_nombre',
        'cantidad',
        'precio_unitario',
        'subtotal',
    )

    search_fields = (
        'medicamento_nombre',
        'venta__referencia',
    )