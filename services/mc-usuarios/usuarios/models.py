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


class RegistroAuditoriaUsuario(models.Model):
    actor_id = models.PositiveBigIntegerField()
    actor_username = models.CharField(max_length=150)
    accion = models.CharField(max_length=30)
    usuario_id = models.PositiveBigIntegerField()
    usuario_username = models.CharField(max_length=150)
    cambios = models.JSONField(default=dict, blank=True)
    fecha_evento = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-fecha_evento',)
        indexes = [
            models.Index(
                fields=('usuario_id', 'fecha_evento'),
                name='user_audit_target_idx',
            ),
        ]