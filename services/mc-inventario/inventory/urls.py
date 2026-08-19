from rest_framework.routers import DefaultRouter

from .views import (
    AlertaViewSet,
    CategoriaViewSet,
    LaboratorioViewSet,
    LoteViewSet,
    MedicamentoViewSet,
    MovimientoInventarioViewSet,
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