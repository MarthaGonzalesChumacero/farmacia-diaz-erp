from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):

    class Rol(models.TextChoices):
        ADMINISTRADOR = 'administrador', 'Administrador'
        AUXILIAR = 'auxiliar', 'Auxiliar'

    rol = models.CharField(
        max_length=20,
        choices=Rol.choices,
        default=Rol.AUXILIAR,
    )

    telefono = models.CharField(
        max_length=20,
        blank=True,
    )

    activo = models.BooleanField(
        default=True,
    )

    fecha_registro = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f'{self.username} - {self.get_rol_display()}'