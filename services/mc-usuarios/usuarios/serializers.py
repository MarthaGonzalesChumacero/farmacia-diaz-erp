from django.contrib.auth import get_user_model
from rest_framework import serializers


Usuario = get_user_model()


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
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

    def create(self, validated_data):
        password = validated_data.pop('password')

        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()

        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for atributo, valor in validated_data.items():
            setattr(instance, atributo, valor)

        if password:
            instance.set_password(password)

        instance.save()

        return instance