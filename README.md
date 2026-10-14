
# Farmacia Díaz ERP

**Sistema ERP basado en microservicios para la gestión automatizada de inventarios de la Farmacia Díaz, Sucre – Gestión 2026.**

Proyecto académico desarrollado con Python, Django REST Framework, PostgreSQL, React, TypeScript y Docker.

## 1. Descripción del proyecto

Farmacia Díaz ERP es un sistema de gestión empresarial orientado a digitalizar y automatizar los procesos de inventario de una farmacia.

El proyecto busca mejorar el control de medicamentos, lotes, movimientos de inventario, stock mínimo, fechas de vencimiento, alertas y operaciones relacionadas con las ventas.

El sistema utiliza una arquitectura basada en microservicios, donde cada servicio tiene responsabilidades específicas y se comunica mediante APIs REST.

**Estado general: prototipo académico funcional en entorno de desarrollo.**

El sistema implementa inventario, ventas, control de stock, alertas, administración de usuarios, QR/códigos y reportes. La comunicación se realiza directamente entre el frontend y las APIs; no existe API Gateway. La configuración actual usa servidores Django/Vite de desarrollo y no debe exponerse como despliegue de producción.

---

## 2. Objetivo general

Desarrollar un sistema ERP basado en microservicios y herramientas de digitalización para mejorar la gestión automatizada de inventarios de la Farmacia Díaz, permitiendo controlar medicamentos, lotes, movimientos, stock, vencimientos, alertas y operaciones relacionadas con las ventas.

## 3. Objetivos funcionales

- Digitalizar el registro y consulta de medicamentos.
- Gestionar lotes y movimientos de inventario.
- Controlar el stock mínimo y las fechas de vencimiento.
- Generar alertas relacionadas con el inventario.
- Registrar y consultar ventas.
- Implementar autenticación y control de acceso.
- Integrar los diferentes módulos mediante APIs REST.
- Incorporar herramientas de digitalización, como códigos de barras y códigos QR.
- Generar reportes que faciliten la toma de decisiones.

---

## 4. Estado actual del proyecto

El proyecto cuenta con tres microservicios principales:

1. `mc-inventario`
2. `mc-ventas`
3. `mc-usuarios`

También dispone de un frontend desarrollado con React y TypeScript.

### 4.1. Funcionalidades implementadas

**Inventario (`mc-inventario`):**

- CRUD de medicamentos, categorías, laboratorios y proveedores; desactivación lógica sin borrado de datos.
- Lotes asociados opcionalmente a proveedor. El stock inicial crea un movimiento de entrada.
- Edición de metadatos del lote; cantidades protegidas para que solo cambien mediante movimientos.
- Entradas, salidas, ajustes, bajas por vencimiento y descuentos de venta con kardex, motivo, saldo resultante y referencia.
- Selección FEFO en ventas, excluyendo lotes vencidos y medicamentos inactivos.
- Alertas pendientes/revisadas y tareas programadas de stock/vencimientos.
- Reportes de stock crítico agregado, vencimientos y movimientos filtrables.
- Auditoría de operaciones con actor validado cuando el JWT está disponible; lectura restringida al rol Administrador.

**Ventas (`mc-ventas`):**

- Registro e historial con cálculo de subtotales y totales.
- Descuento de existencias mediante endpoint transaccional de inventario.
- Referencias idempotentes. Ventas incompletas quedan pendientes y pueden reintentarse sin repetir descuentos.

**Usuarios (`mc-usuarios`):**

- Autenticación JWT, endpoint de identidad, roles Administrador/Auxiliar y gestión administrativa protegida.
- Cuentas desactivadas no pueden obtener JWT; la API no expone borrado ni edición de contraseñas existentes.
- Auditoría de altas, activaciones, desactivaciones y cambios de rol, visible solo para Administradores.

**Frontend:**

- Login, Dashboard, Inventario, Control de stock, Ventas, Alertas, Usuarios, Proveedores e Informes.
- Edición y desactivación lógica de medicamentos/lotes; movimientos auditables.
- Generación de QR internos `FDE:MED:<id>` y `FDE:LOTE:<id>`; lector de cámara ZXing para QR/códigos de barras y búsqueda manual.
- Exportación CSV de reportes.

### 4.2. Alcance pendiente de producción

- API Gateway, si el despliegue académico requiere una entrada centralizada.
- Endurecimiento de secretos, `DEBUG`, CORS y servidores de producción.
- Validación manual de cámara/lectores físicos, impresoras y aceptación de usuarios.
- Estrategia automática de reintentos/compensación para fallos distribuidos entre ventas e inventario.
- Monitoreo, copias de seguridad operativas y despliegue productivo.

---

## 5. Arquitectura del sistema

El ERP utiliza una arquitectura de microservicios.

Cada microservicio administra una responsabilidad específica y expone endpoints REST para comunicarse con otros componentes.

### 5.1. Diagrama de arquitectura actual

```text
                      FARMACIA DÍAZ ERP
                  Arquitectura de microservicios

                  ┌────────────────────────┐
                  │        USUARIO         │
                  │ Administrador/Auxiliar │
                  └────────────┬───────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │        FRONTEND        │
                  │ React + TypeScript     │
                  │ Vite + Tailwind CSS    │
                  │                        │
                  │ Login                  │
                  │ Dashboard              │
                  │ Inventario             │
                  │ Registro medicamentos  │
                  └────────────┬───────────┘
                               │
                         HTTP / REST
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
  ┌──────────────────┐ ┌────────────────┐ ┌────────────────┐
  │  mc-inventario   │ │   mc-ventas    │ │  mc-usuarios   │
  │                  │ │                │ │                │
  │ Medicamentos     │ │ Ventas         │ │ Login          │
  │ Lotes            │ │ Detalles       │ │ JWT            │
  │ Movimientos      │ │ Totales        │ │ Usuarios       │
  │ Alertas          │ │ Estados        │ │ Roles          │
  │ Reportes         │ │                │ │                │
  └────────┬─────────┘ └───────┬────────┘ └───────┬────────┘
           │                   │                  │
           ▼                   ▼                  ▼
  ┌──────────────────┐ ┌────────────────┐ ┌────────────────┐
  │    PostgreSQL    │ │ Base de datos  │ │ Base de datos  │
  │    Inventario    │ │    Ventas      │ │    Usuarios    │
  └──────────────────┘ └────────────────┘ └────────────────┘

           ┌────────────────────────────────────┐
           │ Procesamiento de tareas            │
           │                                    │
           │ Redis + Celery + Celery Beat        │
           │ Alertas y tareas programadas       │
           └────────────────────────────────────┘
```

**Arquitectura real:** el frontend consume directamente `mc-inventario`, `mc-ventas` y `mc-usuarios` por HTTP/REST. Cada servicio usa su propia base PostgreSQL. `mc-ventas` solicita a Inventario la operación FEFO; `mc-inventario` valida el JWT consultando `mc-usuarios` cuando atribuye eventos de auditoría. Redis/Celery/Beat se usan para tareas de inventario. No hay API Gateway.

### 5.2. Componentes fuera del alcance actual

No hay API Gateway. Para el prototipo académico el frontend consume directamente las tres APIs. Un Gateway o balanceador puede evaluarse en un despliegue futuro, pero no es requisito para ejecutar los módulos actuales.

---

## 6. Microservicio de Inventario

**Servicio:** `mc-inventario` · Django REST Framework · PostgreSQL · Redis/Celery.

Administra categorías, laboratorios, medicamentos, proveedores, lotes, movimientos, alertas, auditoría y reportes. Las rutas raíz de la API son `http://localhost:8000/`.

| Recurso | Operaciones principales |
|---|---|
| `/medicamentos/` | GET/POST/PATCH; desactivación lógica mediante `activo`. No hay borrado físico por API. |
| `/proveedores/` | GET/POST/PATCH; directorio y desactivación lógica, no compras. |
| `/lotes/` | GET/POST/PATCH de metadatos. Cantidades no editables; no hay borrado. |
| `/movimientos/` | GET/POST de entrada, salida, ajustes y baja por vencimiento. Cada operación exige motivo. |
| `/movimientos/registrar-venta/` | POST idempotente; descuenta lotes FEFO vigentes dentro de una transacción. |
| `/movimientos/reporte-kardex/` | GET con filtros opcionales `tipo`, `medicamento`, `desde`, `hasta`. |
| `/alertas/` | GET y PATCH `/alertas/{id}/estado/`; pendientes y revisadas. |
| `/alertas/reporte-stock-critico/` | GET, stock agregado por medicamento excluyendo lotes vencidos. |
| `/alertas/reporte-vencimientos/?dias=30` | GET, lotes vigentes por vencer. |
| `/auditoria/` | GET de solo lectura; acceso de Administrador. |

El alta de lote crea un movimiento de entrada por su cantidad inicial. Ajustar existencias siempre requiere registrar un movimiento; Django Admin también mantiene lotes, kardex y auditoría como solo lectura.

El stock crítico compara la suma de lotes activos y no vencidos con `stock_minimo`. Las tareas Celery revisan stock y vencimientos diariamente.

---

## 7. Microservicio de Ventas

**Nombre:** `mc-ventas`

**Tecnologías:**

- Python.
- Django.
- Django REST Framework.
- API REST.

### 7.1. Funcionalidades desarrolladas

- Registro de ventas.
- Registro de detalles de venta.
- Asociación de medicamentos mediante identificadores externos.
- Registro de cantidades.
- Registro de precios unitarios.
- Cálculo de subtotales.
- Cálculo del total.
- Consulta de ventas.
- Estados de venta.
- Observaciones.

Los estados contemplados incluyen:

- Pendiente.
- Completada.
- Anulada.

### 7.2. Modelo de ventas

```text
Venta
 │
 ├── id
 ├── referencia
 ├── fecha_venta
 ├── total
 ├── estado
 ├── observacion
 │
 └── DetalleVenta
      ├── medicamento_id
      ├── medicamento_nombre
      ├── cantidad
      ├── precio_unitario
      └── subtotal
```

### 7.3. Ejemplo de venta

```json
{
  "referencia": "V001",
  "estado": "pendiente",
  "observacion": "Venta de prueba",
  "detalles": [
    {
      "medicamento_id": 1,
      "medicamento_nombre": "Paracetamol",
      "cantidad": 2,
      "precio_unitario": "10.00"
    }
  ]
}
```

El backend calcula:

```text
Cantidad: 2
Precio unitario: Bs 10.00
Subtotal: Bs 20.00
Total: Bs 20.00
```

### 7.4. Endpoints

```http
GET  /ventas/
POST /ventas/
GET  /ventas/{id}/
```

La API no expone PUT/DELETE: una venta completada no se edita ni elimina sin un flujo compensatorio de devolución.

### 7.5. Estado de integración

El frontend permite registrar ventas e inspeccionar el historial. Ventas crea primero la operación en estado `pendiente` y llama a Inventario con la misma referencia. Inventario elige lotes vigentes por FEFO y procesa los movimientos de forma atómica. Si la comunicación falla, la venta queda pendiente y puede reintentarse desde el historial. Repetir la referencia no duplica descuentos.

La transacción distribuida entre dos bases separadas no es ACID: los pendientes requieren reintento manual; no hay todavía outbox ni compensación automática.

---

## 8. Microservicio de Usuarios

**Nombre:** `mc-usuarios`

### 8.1. Funcionalidades implementadas

- JWT en `/api/token/` y renovación en `/api/token/refresh/`.
- Identidad autenticada en `/usuarios/me/`.
- CRUD administrativo sin borrado, con altas, edición, roles y activación/desactivación.
- Roles `administrador` y `auxiliar`, validados por el backend.
- Auditoría de administración en `/auditoria/`, disponible solo para Administradores.

### 8.2. Roles

El sistema contempla:

**Administrador**

Responsable de la administración general del ERP.

**Auxiliar**

Usuario destinado a operaciones autorizadas de la farmacia.

### 8.3. Seguridad

El frontend utiliza JWT para identificar sesiones autenticadas.

Las pantallas principales están protegidas mediante `ProtectedRoute`.

El token de acceso se envía en las solicitudes autenticadas que lo requieren.

### 8.4. Reglas de acceso

- Solo Administrador lista, crea, edita, activa y desactiva cuentas.
- Auxiliar puede autenticarse y consultar `/usuarios/me/`, pero no administrar usuarios ni leer auditoría.
- Usuarios desactivados no obtienen JWT. La edición de usuario no acepta contraseñas; no existe borrado por API.
- El Dashboard oculta la administración a auxiliares y la ruta `/usuarios` verifica el rol en el backend.

**Nota:** Ocultar una pantalla en React no reemplaza la autorización que debe aplicar el backend.

---

## 9. Frontend

El frontend está desarrollado con:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- React Router.
- Axios.
- Lucide React.

### 9.1. Login

**Estado: IMPLEMENTADO**

Permite iniciar sesión mediante credenciales y obtener un token JWT.

### 9.2. Dashboard

**Estado: IMPLEMENTADO**

Muestra indicadores conectados a los microservicios:

- Total de medicamentos.
- Total de ventas.
- Total de alertas.
- Total de usuarios.

También muestra información del usuario autenticado.

### 9.3. Inventario de medicamentos

**Estado: IMPLEMENTADO**

Permite:

- Consultar medicamentos.
- Buscar medicamentos.
- Visualizar códigos de barras.
- Consultar el estado activo o inactivo.
- Actualizar el listado.
- Abrir el formulario de registro.

### 9.4. Registro de medicamentos

**Estado: IMPLEMENTADO**

Permite:

- Completar los datos del medicamento.
- Validar campos obligatorios.
- Enviar los datos a la API.
- Mostrar errores.
- Mostrar confirmación de registro.
- Regresar al inventario.

### 9.5. Módulos frontend

- **Inventario:** búsqueda por texto/código, edición y desactivación lógica de medicamentos; proveedores; alta/consulta/edición de metadatos de lotes.
- **Control de stock:** existencias utilizables, stock crítico, agotados, vencimientos y kardex; movimientos con motivo/referencia.
- **Ventas:** registro, historial y reintento de ventas pendientes con la misma referencia.
- **Alertas:** pendientes/revisadas, reapertura y verificación manual de vencimientos.
- **Usuarios:** gestión exclusiva de Administradores; edición sin campo para contraseñas existentes.
- **Identificación:** QR internos `FDE:MED:<id>` y `FDE:LOTE:<id>`; lectura de QR/códigos 1D por cámara, lector USB o entrada manual.
- **Reportes:** stock crítico, vencimientos, kardex filtrado y auditoría; exportación CSV.

### 9.6. Rutas de trabajo

| Ruta | Acceso/uso |
|---|---|
| `/inventario` | Catálogo, alta/edición/desactivación de medicamentos; acceso a proveedores, lotes, lector y reportes. |
| `/inventario/stock` | Existencias, movimientos auditables, vencimientos. |
| `/inventario/proveedores` | Directorio asociado a lotes; no procesa compras. |
| `/inventario/identificar` | Cámara, lector USB o texto para QR/código de barras. |
| `/inventario/reportes` | Stock, vencimientos, kardex y, para Administradores, auditoría. |
| `/alertas` | Revisión y reapertura de alertas. |
| `/ventas` | Historial y reintento de pendientes. |
| `/usuarios` | Solo Administrador. |

El lector de cámara requiere permisos del navegador y un contexto seguro; `localhost` se considera seguro durante desarrollo. El lector USB funciona como entrada de texto.

---

## 10. Comunicación entre microservicios

Cada microservicio tiene responsabilidades independientes.

Un servicio no debe modificar directamente las tablas internas de otro.

Por ejemplo, el microservicio de ventas debe comunicarse con inventario mediante una API para verificar y actualizar existencias.

### Flujo previsto de una venta

```text
                  Usuario
                     │
                     ▼
               Frontend React
                     │
                     ▼
                 mc-ventas
                     │
                     ▼
          Solicita validar el stock
                     │
                     ▼
               mc-inventario
                     │
             ┌───────┴────────┐
             │                │
             ▼                ▼
       Stock disponible   Sin existencias
             │                │
             ▼                ▼
       Autoriza venta     Rechaza operación
             │
             ▼
       Registra la venta
             │
             ▼
       Descuenta el stock
             │
             ▼
       Registra movimiento
             │
             ▼
       Verifica stock mínimo
             │
             ▼
       Genera alerta si corresponde
```

**Estado: implementado con consistencia eventual.**

Inventario valida stock bajo bloqueo, excluye lotes vencidos/inactivos, procesa FEFO y reconoce una referencia ya aplicada. Ventas mantiene `pendiente` hasta que Inventario confirma el descuento y permite reintentar desde el historial. Los servicios conservan bases separadas; no existe transacción ACID distribuida ni reintento automático por outbox.

---

## 11. Tecnologías utilizadas

| Tecnología | Uso | Estado |
|---|---|---|
| Python | Backend | Implementado |
| Django | Microservicios | Implementado |
| Django REST Framework | APIs REST | Implementado |
| PostgreSQL | Bases independientes de inventario, ventas y usuarios | Implementado |
| React | Frontend | Implementado |
| TypeScript | Frontend | Implementado |
| Vite | Desarrollo y compilación | Implementado |
| Tailwind CSS | Estilos | Implementado |
| React Router | Navegación | Implementado |
| Axios | Comunicación HTTP | Implementado |
| JWT | Autenticación | Implementado |
| Docker | Contenedores | Implementado |
| Docker Compose | Orquestación local | Implementado |
| Redis | Broker de tareas | Implementado en inventario |
| Celery | Tareas asíncronas | Implementado en inventario |
| Celery Beat | Tareas programadas | Implementado en inventario |
| Swagger/OpenAPI | Documentación de API | Implementado en inventario |
| API Gateway | Entrada centralizada | No implementado; los servicios exponen puertos directos |
| ZXing Browser | Lectura QR y códigos 1D en navegador | Implementado |
| qrcode.react | Generación de QR SVG | Implementado |

---

## 12. Estructura del proyecto

```text
farmacia-diaz-erp/
├── frontend/                 # React, TypeScript, Vite, Tailwind
├── services/
│   ├── mc-inventario/        # Medicamentos, proveedores, lotes, kardex, alertas
│   ├── mc-ventas/            # Ventas y comunicación HTTP con inventario
│   └── mc-usuarios/          # JWT, roles y administración de cuentas
├── docker-compose.yml        # Tres APIs, tres PostgreSQL, Redis y Celery
└── README.md
```

Cada microservicio conserva su propio modelo y base de datos. El frontend consume APIs HTTP directamente; no comparte tablas entre servicios.

---

## 13. Ejecución del proyecto

### 13.1. Requisitos

Para trabajar localmente se necesita:

- Git.
- Docker Desktop.
- Docker Compose.
- Node.js.
- pnpm.
- Visual Studio Code.

### 13.2. Clonar el repositorio

```bash
git clone https://github.com/MarthaGonzalesChumacero/farmacia-diaz-erp.git
```

Entrar al proyecto:

```bash
cd farmacia-diaz-erp
```

### 13.3. Configuración

Docker Compose espera un archivo `.env` local en cada servicio, ignorado por Git. Define las variables requeridas sin reutilizar contraseñas de producción:

| Servicio | Variables |
|---|---|
| `mc-inventario` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `DJANGO_SECRET_KEY` (recomendado; si falta, desarrollo usa `POSTGRES_PASSWORD` como fallback) |
| `mc-ventas` | Las cinco anteriores y `INVENTARIO_API_URL` (en Compose: `http://mc-inventario:8000`) |
| `mc-usuarios` | Las cinco anteriores, `DJANGO_SECRET_KEY` y `DEBUG` |

No compartas ni subas archivos `.env`, claves JWT o contraseñas. Los valores por defecto actuales son para desarrollo; antes de producción hay que externalizar secretos y desactivar `DEBUG`.

### 13.4. Iniciar los contenedores

Desde la carpeta principal:

```bash
docker compose up -d --build
```

Para revisar el estado:

```bash
docker compose ps
```

### 13.5. Aplicar migraciones aditivas

La primera instalación requiere crear el esquema de los tres servicios:

```bash
docker compose exec mc-inventario python manage.py migrate
docker compose exec mc-ventas python manage.py migrate
docker compose exec mc-usuarios python manage.py migrate
```

Las migraciones `inventory.0007` (proveedores y FK nullable), `inventory.0008` (auditoría) y `usuarios.0002` (auditoría de usuarios) son aditivas y conservan los registros existentes.

### 13.6. Crear el primer administrador

```bash
docker compose exec mc-usuarios python manage.py createsuperuser
```

Entra a `http://localhost:8002/admin/` con esa cuenta y asígnale el rol `administrador` antes de usar la administración del ERP. Las cuentas nuevas desde el ERP requieren una contraseña inicial; las contraseñas existentes no se cambian.

### 13.7. Iniciar el frontend

```bash
cd frontend
```

Instalar dependencias:

```bash
pnpm install
```

Ejecutar:

```bash
pnpm dev
```

Vite usa el puerto 5173 por defecto; si está ocupado selecciona el siguiente disponible. Abrir la URL que muestre la terminal, por ejemplo:

```text
http://localhost:5173
```

### 13.8. Compilar y verificar

```bash
pnpm build
pnpm lint
```

Para ejecutar pruebas backend, usa `python manage.py test` dentro del contenedor del servicio. Django crea una base de pruebas temporal separada de la base operativa.

---

## 14. Puertos de desarrollo

Durante las pruebas locales se utilizan:

| Servicio | Dirección |
|---|---|
| Frontend | `http://localhost:5173` (o puerto alternativo de Vite) |
| Inventario API | `http://localhost:8000` |
| Ventas API | `http://localhost:8001` |
| Usuarios API | `http://localhost:8002` |
| Django Admin de usuarios | `http://localhost:8002/admin/` |

Estas direcciones corresponden al entorno de desarrollo local.

---

## 15. Pruebas realizadas

Durante el desarrollo se han realizado pruebas funcionales.

### 15.1. Autenticación

- Inicio de sesión.
- Obtención de JWT.
- Consulta del usuario autenticado.
- Acceso a rutas protegidas.
- Cierre de sesión.

### 15.2. Dashboard

Se comprobó la obtención de datos desde:

- Inventario.
- Ventas.
- Alertas.
- Usuarios.

### 15.3. Inventario

Se comprobó:

- Consulta de medicamentos.
- Búsqueda.
- Registro mediante formulario.
- Confirmación de registro.
- Actualización del listado.
- Navegación entre pantallas.

### 15.4. Medicamentos de prueba

Durante las pruebas se registraron:

- Paracetamol 500 mg.
- Ibuprofeno 400 mg.

El inventario mostró ambos registros correctamente.

Estos datos corresponden a pruebas de desarrollo y no representan necesariamente el inventario real de la farmacia.

### 15.5. Compilación

Se ejecutó:

```bash
pnpm build
```

La compilación del frontend terminó correctamente.

### 15.6. Resultados y verificación manual

- En la última regresión pasaron 38 pruebas de inventario/reportes/auditoría, 12 de ventas y 11 de usuarios.
- `pnpm build` pasa. `pnpm lint` conserva avisos de carga inicial en Inventario y Consulta de lotes.
- La lectura física con cámara, impresora de etiquetas y prueba de aceptación en farmacia requieren verificación manual.
- Antes de producción faltan pruebas de concurrencia con PostgreSQL, rendimiento, recuperación y despliegue seguro.

---

## 16. Plan de desarrollo

Las etapas funcionales académicas de inventario, ventas, usuarios, alertas, proveedores, digitalización, reportes y auditoría están implementadas. El cierre de grado se centra en la validación manual de hardware/operación, documentación de resultados y, si se requiere producción, endurecimiento y despliegue.

No se propone introducir API Gateway ni un módulo de compras: quedan fuera de la arquitectura y alcance actuales.

---

## 17. Consideraciones técnicas

### Independencia de servicios

Cada microservicio debe mantener separadas sus responsabilidades.

### Integridad de datos

Las operaciones de venta e inventario deberán garantizar que las existencias no se descuenten incorrectamente.

### Seguridad

Usuarios exige JWT, valida roles en backend y registra administración sin almacenar contraseñas en auditoría. Inventario valida el bearer consultando `mc-usuarios` para atribuir los eventos; si el servicio de identidad no responde, registra el evento como anónimo y mantiene disponible la operación.

### Trazabilidad

Inventario audita movimientos, ventas, catálogos y alertas; Usuarios audita administración de cuentas. La lectura está restringida al Administrador.

### Escalabilidad

La arquitectura de microservicios permite desarrollar y desplegar componentes de manera independiente, aunque también requiere gestionar la comunicación y coordinación entre ellos.

---

## 18. Limitaciones actuales

El ERP está preparado como prototipo académico local, no como despliegue productivo. La venta distribuida usa idempotencia y estado pendiente con reintento manual; no implementa outbox/compensación automática. El lector de cámara depende de permisos del navegador y necesita comprobarse en el dispositivo final. La configuración Django actual usa servidores de desarrollo y requiere hardening para producción.

---

## 19. Proyecto académico

**Proyecto:** Farmacia Díaz ERP

**Título:** Sistema ERP basado en microservicios con herramientas de digitalización para la gestión automatizada de inventarios en la Farmacia Díaz, Sucre – Gestión 2026.

**Área:** Desarrollo de software y sistemas de información.

**Arquitectura:** Microservicios.

**Institución:** TECBA.

**Gestión:** 2026.

**Estado:** Prototipo académico funcional; requiere validación manual de operación y hardening antes de producción.

---

## 20. Autora

**Martha Gonzales Chumacero**

Estudiante de Sistemas Informáticos.

GitHub: https://github.com/MarthaGonzalesChumacero

Repositorio: https://github.com/MarthaGonzalesChumacero/farmacia-diaz-erp

---

## 21. Conclusión

Farmacia Díaz ERP integra los tres microservicios existentes con PostgreSQL independiente, comunicación REST directa, operaciones de inventario auditables, ventas FEFO/idempotentes, administración por roles y herramientas de identificación QR/código de barras. Para cerrar el trabajo académico quedan las comprobaciones manuales del hardware y la aceptación operativa, además del endurecimiento requerido antes de un despliegue productivo.
