from types import SimpleNamespace


def usuario_erp(pk=100, username="admin-prueba", rol="administrador"):
    return SimpleNamespace(
        pk=pk,
        username=username,
        rol=rol,
        is_authenticated=True,
        get_username=lambda: username,
    )