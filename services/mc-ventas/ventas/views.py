from rest_framework import mixins, viewsets

from .authentication import UsuarioERPActivo, UsuarioERPAuthentication
from .models import Venta
from .serializers import VentaSerializer


class VentaViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Venta.objects.all().order_by('-fecha_venta')
    serializer_class = VentaSerializer
    authentication_classes = [UsuarioERPAuthentication]
    permission_classes = [UsuarioERPActivo]