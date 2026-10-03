from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import UsuarioSerializer


Usuario = get_user_model()


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('id')
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        if self.action == 'me':
            return [permissions.IsAuthenticated()]

        return [permissions.IsAdminUser()]

    def get_queryset(self):
        queryset = super().get_queryset()

        rol = self.request.query_params.get('rol')
        activo = self.request.query_params.get('activo')

        if rol:
            queryset = queryset.filter(rol=rol)

        if activo is not None:
            activo = activo.lower() == 'true'
            queryset = queryset.filter(activo=activo)

        return queryset

    @action(
        detail=False,
        methods=['get'],
        url_path='me',
    )
    def me(self, request):
        serializer = self.get_serializer(request.user)

        return Response(serializer.data)