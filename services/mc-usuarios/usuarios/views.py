from django.contrib.auth import get_user_model
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import RegistroAuditoriaUsuario
from .serializers import (
    RegistroAuditoriaUsuarioSerializer,
    UsuarioSerializer,
)


Usuario = get_user_model()


class IsActiveUser(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.activo
        )


class IsAdministrador(IsActiveUser):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.rol == Usuario.Rol.ADMINISTRADOR
        )


class UsuarioViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Usuario.objects.all().order_by('id')
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        if self.action == 'me':
            return [IsActiveUser()]

        return [IsAdministrador()]

    def perform_update(self, serializer):
        usuario = serializer.instance
        nuevo_activo = serializer.validated_data.get(
            'activo',
            usuario.activo,
        )
        nuevo_rol = serializer.validated_data.get(
            'rol',
            usuario.rol,
        )

        if usuario.pk == self.request.user.pk and (
            not nuevo_activo
            or nuevo_rol != Usuario.Rol.ADMINISTRADOR
        ):
            raise ValidationError(
                'No puedes desactivar ni degradar tu propia cuenta.'
            )

        valores_antes = {
            campo: getattr(usuario, campo)
            for campo in serializer.validated_data
        }
        actualizado = serializer.save()
        cambios = {
            campo: {
                'antes': valores_antes[campo],
                'despues': getattr(actualizado, campo),
            }
            for campo in serializer.validated_data
            if valores_antes[campo] != getattr(actualizado, campo)
        }
        accion = 'actualizar'
        if cambios.get('activo', {}).get('despues') is False:
            accion = 'desactivar'
        elif cambios.get('activo', {}).get('despues') is True:
            accion = 'activar'
        elif 'rol' in cambios:
            accion = 'cambiar_rol'

        RegistroAuditoriaUsuario.objects.create(
            actor_id=self.request.user.pk,
            actor_username=self.request.user.get_username(),
            accion=accion,
            usuario_id=actualizado.pk,
            usuario_username=actualizado.get_username(),
            cambios=cambios,
        )

    def perform_create(self, serializer):
        usuario = serializer.save()
        RegistroAuditoriaUsuario.objects.create(
            actor_id=self.request.user.pk,
            actor_username=self.request.user.get_username(),
            accion='crear',
            usuario_id=usuario.pk,
            usuario_username=usuario.get_username(),
            cambios={
                'rol': usuario.rol,
                'activo': usuario.activo,
            },
        )

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


class AuditoriaUsuarioViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = RegistroAuditoriaUsuario.objects.all()
    serializer_class = RegistroAuditoriaUsuarioSerializer

    def get_permissions(self):
        return [IsAdministrador()]