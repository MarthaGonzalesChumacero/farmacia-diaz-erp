from django.contrib import admin

from .models import (
    Categoria,
    Laboratorio,
    Medicamento,
    Lote,
    MovimientoInventario,
    Proveedor,
    RegistroAuditoria,
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


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'contacto', 'telefono', 'email', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre', 'contacto', 'telefono', 'email')


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
    readonly_fields = (
        'medicamento',
        'numero_lote',
        'fecha_vencimiento',
        'cantidad_inicial',
        'cantidad_actual',
        'precio_compra',
        'precio_venta',
        'fecha_ingreso',
        'activo',
    )

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

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    readonly_fields = (
        'lote',
        'tipo',
        'cantidad',
        'stock_resultante',
        'motivo',
        'referencia',
        'fecha_movimiento',
    )

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

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False




@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    list_display = (
        'fecha_evento',
        'actor_username',
        'accion',
        'entidad',
        'entidad_id',
        'referencia',
        'direccion_ip',
    )
    list_filter = ('accion', 'entidad', 'fecha_evento')
    search_fields = ('actor_username', 'referencia', 'entidad_id')
    readonly_fields = (
        'accion',
        'entidad',
        'entidad_id',
        'actor_id',
        'actor_username',
        'referencia',
        'detalles',
        'direccion_ip',
        'user_agent',
        'fecha_evento',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False