from datetime import timedelta

from django.utils import timezone

from inventory.models import Lote
from inventory.repositories.alerta_repository import AlertaRepository
from inventory.services.auditoria_service import AuditoriaService


class VencimientoService:

    @staticmethod
    def obtener_lotes_por_vencer(dias=30):
        hoy = timezone.localdate()
        fecha_limite = hoy + timedelta(days=dias)

        return Lote.objects.filter(
            activo=True,
            fecha_vencimiento__gte=hoy,
            fecha_vencimiento__lte=fecha_limite,
            cantidad_actual__gt=0,
        )

    @staticmethod
    def generar_alertas_vencimiento(dias=30):
        hoy = timezone.localdate()
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

            alertas_pendientes = list(
                AlertaRepository.obtener_alertas_vencimiento_pendientes_lote(
                    medicamento=lote.medicamento,
                    numero_lote=lote.numero_lote,
                )
            )

            if not alertas_pendientes:
                AlertaRepository.crear_alerta_vencimiento(
                    medicamento=lote.medicamento,
                    mensaje=mensaje,
                )
                alertas_creadas += 1
            else:
                alerta_principal = alertas_pendientes[0]
                if alerta_principal.mensaje != mensaje:
                    alerta_principal.mensaje = mensaje
                    alerta_principal.save(update_fields=["mensaje"])

                # Si existían alertas pendientes antiguas duplicadas previas para este mismo lote,
                # marcarlas como revisadas conservando el historial de auditoría
                for duplicada in alertas_pendientes[1:]:
                    duplicada.leida = True
                    duplicada.save(update_fields=["leida"])
                    AuditoriaService.registrar(
                        request=None,
                        accion="marcar_revisada",
                        entidad="alerta",
                        entidad_id=duplicada.pk,
                        referencia=f"Consolidación alerta duplicada lote {lote.numero_lote}",
                        detalles={
                            "leida_antes": False,
                            "leida": True,
                            "motivo": "consolidacion_duplicado",
                            "alerta_principal_id": alerta_principal.pk,
                        },
                    )

        return {
            "lotes_revisados": lotes.count(),
            "alertas_creadas": alertas_creadas,
        }