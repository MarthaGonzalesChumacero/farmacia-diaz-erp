from celery import shared_task

from .services.vencimiento_service import VencimientoService


@shared_task
def verificar_vencimientos():
    return VencimientoService.generar_alertas_vencimiento(
        dias=30
    )