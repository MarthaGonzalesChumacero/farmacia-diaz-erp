
from celery import shared_task

from .services.vencimiento_service import VencimientoService
from .services.stock_service import StockService


@shared_task
def verificar_vencimientos():
    return VencimientoService.generar_alertas_vencimiento(
        dias=30
    )


@shared_task
def verificar_stock():
    return StockService.verificar_todos_los_medicamentos()
