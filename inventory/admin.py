from django.contrib import admin

from .models import (
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
    MovimientoInventario,
)


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'nombre',
        'activo',
    )

    search_fields = (
        'nombre',
    )


@admin.register(Laboratorio)
class LaboratorioAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'nombre',
        'activo',
    )

    search_fields = (
        'nombre',
    )


@admin.register(Medicamento)
class MedicamentoAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'nombre',
        'categoria',
        'laboratorio',
        'stock_minimo',
        'activo',
    )

    list_filter = (
        'categoria',
        'laboratorio',
        'activo',
    )

    search_fields = (
        'nombre',
        'principio_activo',
        'codigo_barras',
    )


@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'medicamento',
        'numero_lote',
        'fecha_vencimiento',
        'cantidad_actual',
        'precio_compra',
        'precio_venta',
        'activo',
    )

    list_filter = (
        'activo',
        'fecha_vencimiento',
    )

    search_fields = (
        'numero_lote',
        'medicamento__nombre',
    )


@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'lote',
        'tipo',
        'cantidad',
        'fecha_movimiento',
    )

    list_filter = (
        'tipo',
        'fecha_movimiento',
    )

    search_fields = (
        'lote__numero_lote',
        'motivo',
        'referencia',
    )