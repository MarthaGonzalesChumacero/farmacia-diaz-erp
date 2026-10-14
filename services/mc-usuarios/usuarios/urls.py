from rest_framework.routers import DefaultRouter

from .views import AuditoriaUsuarioViewSet, UsuarioViewSet


router = DefaultRouter()

router.register(
    'usuarios',
    UsuarioViewSet,
    basename='usuario',
)

router.register(
    'auditoria',
    AuditoriaUsuarioViewSet,
    basename='auditoria-usuario',
)

urlpatterns = router.urls