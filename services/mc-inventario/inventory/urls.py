from rest_framework.routers import DefaultRouter

from .views import (
    AlertaViewSet,
    CategoriaViewSet,
    LaboratorioViewSet,
    LoteViewSet,
    MedicamentoViewSet,
    MovimientoInventarioViewSet,
    ProveedorViewSet,
    RegistroAuditoriaViewSet,
)

router = DefaultRouter()

router.register(
    r'categorias',
    CategoriaViewSet,
    basename='categoria',
)

router.register(
    r'laboratorios',
    LaboratorioViewSet,
    basename='laboratorio',
)

router.register(
    r'proveedores',
    ProveedorViewSet,
    basename='proveedor',
)

router.register(
    r'auditoria',
    RegistroAuditoriaViewSet,
    basename='auditoria',
)

router.register(
    r'medicamentos',
    MedicamentoViewSet,
    basename='medicamento',
)

router.register(
    r'lotes',
    LoteViewSet,
    basename='lote',
)

router.register(
    r'movimientos',
    MovimientoInventarioViewSet,
    basename='movimiento',
)

router.register(
    r'alertas',
    AlertaViewSet,
    basename='alerta',
)

urlpatterns = router.urls