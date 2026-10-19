import json
import os
from urllib.error import URLError
from urllib.request import Request, urlopen

from inventory.models import RegistroAuditoria


class AuditoriaService:
    @staticmethod
    def _obtener_actor(request):
        if not request:
            return None, "sistema", None

        autorizacion = getattr(request, "headers", {}).get("Authorization", "")
        if autorizacion.startswith("Bearer "):
            base_url = os.getenv(
                "USUARIOS_API_URL",
                "http://mc-usuarios:8000",
            ).rstrip("/")
            consulta = Request(
                f"{base_url}/usuarios/me/",
                headers={"Authorization": autorizacion},
            )
            try:
                with urlopen(consulta, timeout=2) as respuesta:
                    usuario = json.loads(respuesta.read().decode("utf-8"))
                return (
                    int(usuario["id"]),
                    str(usuario["username"]),
                    str(usuario["rol"]),
                )
            except (URLError, TimeoutError, ValueError, KeyError, TypeError):
                return None, "anónimo", None

        usuario_autenticado = getattr(request, "user", None)
        if (
            usuario_autenticado
            and getattr(usuario_autenticado, "is_authenticated", False)
            and hasattr(usuario_autenticado, "rol")
        ):
            return (
                usuario_autenticado.pk,
                usuario_autenticado.get_username(),
                usuario_autenticado.rol,
            )

        return None, "anónimo", None

    @staticmethod
    def registrar(
        request,
        accion,
        entidad,
        entidad_id=None,
        referencia="",
        detalles=None,
    ):
        actor_id, actor_username, _ = AuditoriaService._obtener_actor(request)
        meta = getattr(request, "META", {}) if request else {}

        return RegistroAuditoria.objects.create(
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            actor_id=actor_id,
            actor_username=actor_username,
            referencia=referencia,
            detalles=detalles or {},
            direccion_ip=meta.get("REMOTE_ADDR") or None,
            user_agent=meta.get("HTTP_USER_AGENT", "")[:255] if meta else "",
        )