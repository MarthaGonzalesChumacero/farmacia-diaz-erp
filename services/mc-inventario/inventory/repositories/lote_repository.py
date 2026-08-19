from inventory.models import Lote


class LoteRepository:

    @staticmethod
    def guardar(lote: Lote):
        lote.save()
        return lote

    @staticmethod
    def obtener_por_id(lote_id: int):
        return Lote.objects.get(id=lote_id)