from datetime import timedelta

from django.utils import timezone

from inventory.models import Lote
from inventory.repositories.alerta_repository import AlertaRepository


class VencimientoService:

    @staticmethod
    def obtener_lotes_por_vencer(dias=30):
        hoy = timezone.now().date()
        fecha_limite = hoy + timedelta(days=dias)

        return Lote.objects.filter(
            activo=True,
            fecha_vencimiento__gte=hoy,
            fecha_vencimiento__lte=fecha_limite,
            cantidad_actual__gt=0,
        )

    @staticmethod
    def generar_alertas_vencimiento(dias=30):
        hoy = timezone.now().date()
        lotes = VencimientoService.obtener_lotes_por_vencer(dias)

        alertas_creadas = 0

        for lote in lotes:
            dias_restantes = (lote.fecha_vencimiento - hoy).days

            mensaje = (
                f"El lote {lote.numero_lote} del medicamento "
                f"{lote.medicamento.nombre} vence en "
                f"{dias_restantes} días, el "
                f"{lote.fecha_vencimiento.strftime('%d/%m/%Y')}."
            )

            alerta_existente = (
                AlertaRepository.obtener_alerta_vencimiento(
                    medicamento=lote.medicamento,
                    mensaje=mensaje,
                )
            )

            if not alerta_existente:
                AlertaRepository.crear_alerta_vencimiento(
                    medicamento=lote.medicamento,
                    mensaje=mensaje,
                )
                alertas_creadas += 1

        return {
            "lotes_revisados": lotes.count(),
            "alertas_creadas": alertas_creadas,
        }