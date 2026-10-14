from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from usuarios.serializers import UsuarioTokenObtainPairSerializer


class UsuarioTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsuarioTokenObtainPairSerializer


urlpatterns = [
    path(
        'admin/',
        admin.site.urls,
    ),

    path(
        '',
        include('usuarios.urls'),
    ),

    path(
        'api/token/',
        UsuarioTokenObtainPairView.as_view(),
        name='token_obtain_pair',
    ),

    path(
        'api/token/refresh/',
        TokenRefreshView.as_view(),
        name='token_refresh',
    ),

    path(
        'api/schema/',
        SpectacularAPIView.as_view(),
        name='schema',
    ),

    path(
        'api/docs/',
        SpectacularSwaggerView.as_view(
            url_name='schema'
        ),
        name='swagger-ui',
    ),
]