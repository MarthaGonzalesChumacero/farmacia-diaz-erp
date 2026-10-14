from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import RegistroAuditoriaUsuario


Usuario = get_user_model()


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
    )

    class Meta:
        model = Usuario
        fields = (
            'id',
            'username',
            'password',
            'first_name',
            'last_name',
            'email',
            'rol',
            'telefono',
            'activo',
            'fecha_registro',
        )

        read_only_fields = (
            'id',
            'fecha_registro',
        )

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError(
                {'password': 'La contraseña inicial es obligatoria.'}
            )

        if self.instance is not None and 'password' in attrs:
            raise serializers.ValidationError(
                {'password': 'La contraseña no se puede modificar desde esta API.'}
            )

        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')

        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.is_active = usuario.activo
        usuario.save()

        return usuario

    def update(self, instance, validated_data):
        for atributo, valor in validated_data.items():
            setattr(instance, atributo, valor)

        if 'activo' in validated_data:
            instance.is_active = validated_data['activo']

        instance.save()

        return instance


class UsuarioTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        if not user.activo:
            raise AuthenticationFailed(
                'La cuenta está desactivada.',
                code='user_inactive',
            )
        return super().get_token(user)


class RegistroAuditoriaUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroAuditoriaUsuario
        fields = '__all__'
        read_only_fields = (
            'actor_id',
            'actor_username',
            'accion',
            'usuario_id',
            'usuario_username',
            'cambios',
            'fecha_evento',
        )