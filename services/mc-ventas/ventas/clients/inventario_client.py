import os

import requests
from rest_framework import status
from rest_framework.exceptions import APIException


class InventarioNoDisponible(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "El servicio de inventario no está disponible."
    default_code = "inventario_no_disponible"


class StockInsuficiente(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "No existe stock suficiente para completar la venta."
    default_code = "stock_insuficiente"


class VentaInventarioRechazada(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Inventario rechazó la operación de venta."
    default_code = "venta_inventario_rechazada"


class InventarioClient:

    BASE_URL = os.getenv(
        'INVENTARIO_API_URL',
        'http://mc-inventario:8000',
    ).rstrip('/')

    TIMEOUT = 5

    @classmethod
    def registrar_venta(cls, referencia, detalles, authorization=None):
        headers = {}
        if authorization:
            headers['Authorization'] = authorization
        try:
            response = requests.post(
                f'{cls.BASE_URL}/movimientos/registrar-venta/',
                json={
                    'referencia': referencia,
                    'detalles': detalles,
                },
                headers=headers,
                timeout=cls.TIMEOUT,
            )
        except requests.RequestException as error:
            raise InventarioNoDisponible() from error

        if response.status_code == status.HTTP_400_BAD_REQUEST:
            try:
                detalle = response.json()
            except ValueError:
                detalle = {
                    'error': 'Inventario rechazó el movimiento.'
                }

            mensaje = str(detalle).lower()
            if 'stock insuficiente' in mensaje:
                raise StockInsuficiente(detalle)
            raise VentaInventarioRechazada(detalle)

        try:
            response.raise_for_status()
        except requests.RequestException as error:
            raise InventarioNoDisponible() from error

        try:
            return response.json()
        except ValueError as error:
            raise InventarioNoDisponible(
                'Inventario devolvió una respuesta inválida.'
            ) from error