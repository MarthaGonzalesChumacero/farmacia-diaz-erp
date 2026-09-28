import os

import requests


class InventarioClient:

    BASE_URL = os.getenv(
        'INVENTARIO_API_URL',
        'http://mc-inventario:8000',
    )

    TIMEOUT = 5

    @classmethod
    def obtener_lotes_por_medicamento(cls, medicamento_id):
        try:
            response = requests.get(
                f'{cls.BASE_URL}/lotes/',
                params={
                    'medicamento': medicamento_id,
                    'activo': 'true',
                },
                timeout=cls.TIMEOUT,
            )

            response.raise_for_status()

            lotes = response.json()

            return [
                lote
                for lote in lotes
                if lote.get('medicamento') == medicamento_id
                and lote.get('activo') is True
                and lote.get('cantidad_actual', 0) > 0
            ]

        except requests.RequestException as error:
            raise ConnectionError(
                'No se pudo consultar el microservicio '
                'de inventario.'
            ) from error

    @classmethod
    def registrar_salida(
        cls,
        lote_id,
        cantidad,
        referencia,
        motivo,
    ):
        datos = {
            'tipo': 'salida',
            'cantidad': cantidad,
            'motivo': motivo,
            'referencia': referencia,
            'lote': lote_id,
        }

        try:
            response = requests.post(
                f'{cls.BASE_URL}/movimientos/',
                json=datos,
                timeout=cls.TIMEOUT,
            )

        except requests.RequestException as error:
            raise ConnectionError(
                'No se pudo conectar con el microservicio '
                'de inventario.'
            ) from error

        if response.status_code == 400:
            try:
                detalle = response.json()
            except ValueError:
                detalle = {
                    'error': 'Inventario rechazó el movimiento.'
                }

            raise ValueError(detalle)

        try:
            response.raise_for_status()

        except requests.RequestException as error:
            raise ConnectionError(
                'Ocurrió un error al registrar la salida '
                'en inventario.'
            ) from error

        return response.json()