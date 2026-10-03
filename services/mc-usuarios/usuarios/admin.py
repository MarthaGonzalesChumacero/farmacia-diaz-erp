from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = (
        'username',
        'first_name',
        'last_name',
        'email',
        'rol',
        'activo',
        'is_staff',
    )

    list_filter = (
        'rol',
        'activo',
        'is_staff',
        'is_superuser',
    )

    search_fields = (
        'username',
        'first_name',
        'last_name',
        'email',
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            'Datos de Farmacia Díaz',
            {
                'fields': (
                    'rol',
                    'telefono',
                    'activo',
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            'Datos de Farmacia Díaz',
            {
                'fields': (
                    'first_name',
                    'last_name',
                    'email',
                    'rol',
                    'telefono',
                    'activo',
                )
            },
        ),
    )