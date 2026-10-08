
# Farmacia Díaz ERP

**Sistema ERP basado en microservicios para la gestión automatizada de inventarios de la Farmacia Díaz, Sucre – Gestión 2026.**

Proyecto académico desarrollado con Python, Django REST Framework, PostgreSQL, React, TypeScript y Docker.

## 1. Descripción del proyecto

Farmacia Díaz ERP es un sistema de gestión empresarial orientado a digitalizar y automatizar los procesos de inventario de una farmacia.

El proyecto busca mejorar el control de medicamentos, lotes, movimientos de inventario, stock mínimo, fechas de vencimiento, alertas y operaciones relacionadas con las ventas.

El sistema utiliza una arquitectura basada en microservicios, donde cada servicio tiene responsabilidades específicas y se comunica mediante APIs REST.

**Estado general: EN DESARROLLO.**

El sistema cuenta con funcionalidades implementadas y probadas, pero todavía no está terminado ni preparado para utilizarse en producción.

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

### 4.1. Funcionalidades implementadas y probadas

**Backend:**

- API REST de inventario.
- Registro y consulta de medicamentos.
- Gestión de categorías y laboratorios mediante API.
- Gestión de lotes y movimientos de inventario mediante API.
- Endpoints de alertas y reportes de inventario.
- API REST de ventas.
- Registro y consulta de ventas.
- Cálculo de subtotales y totales.
- Microservicio de usuarios.
- Autenticación mediante JWT.
- Consulta del usuario autenticado.
- Consulta de usuarios registrados.
- Ejecución de servicios mediante Docker Compose.

**Frontend:**

- Pantalla de inicio de sesión.
- Autenticación con JWT.
- Rutas protegidas.
- Dashboard administrativo.
- Visualización de medicamentos registrados.
- Visualización de ventas registradas.
- Visualización de alertas.
- Visualización de usuarios registrados.
- Pantalla de inventario.
- Listado de medicamentos desde la API.
- Búsqueda por nombre, principio activo y código de barras.
- Registro de nuevos medicamentos.
- Validación de campos obligatorios.
- Mensajes de confirmación y error.
- Navegación entre Dashboard, Inventario y Registro.
- Cierre de sesión.
- Diseño adaptable mediante Tailwind CSS.

### 4.2. Funcionalidades en proceso

- Edición de medicamentos desde el frontend.
- Desactivación y administración de medicamentos.
- Gestión visual de categorías y laboratorios.
- Registro de lotes desde el frontend.
- Control de existencias por lote.
- Gestión visual de entradas, salidas y ajustes.
- Pantalla de ventas.
- Integración entre ventas e inventario.
- Validación de stock durante las ventas.
- Actualización automática de existencias.
- Mejoras en permisos y autorización.

### 4.3. Funcionalidades pendientes

- Lectura y generación de códigos QR.
- Integración completa de códigos de barras.
- Gestión de proveedores desde la interfaz.
- Reportes administrativos y gráficos.
- Historial completo de auditoría.
- Gestión integral de alertas desde el frontend.
- API Gateway.
- Pruebas de integración completas.
- Pruebas de seguridad.
- Preparación para producción.
- Despliegue del ERP.

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

**Nota:** El frontend actualmente consume directamente las APIs de los microservicios.

El API Gateway todavía no está implementado.

### 5.2. Arquitectura prevista

```text
                  ┌─────────────────────┐
                  │       Frontend      │
                  │ React + TypeScript  │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │     API Gateway     │
                  │      PENDIENTE      │
                  └──────────┬──────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │ Inventario  │ │   Ventas    │ │  Usuarios   │
      └─────────────┘ └─────────────┘ └─────────────┘
```

El API Gateway permitirá centralizar las solicitudes, mejorar el control de acceso y facilitar la comunicación con los microservicios.

Su incorporación corresponde a una etapa futura.

---

## 6. Microservicio de Inventario

**Nombre:** `mc-inventario`

**Tecnologías:**

- Python
- Django
- Django REST Framework
- PostgreSQL
- Docker
- Redis
- Celery
- Celery Beat

### 6.1. Responsabilidades

El microservicio administra los datos y procesos relacionados con el inventario.

Incluye:

- Categorías.
- Laboratorios.
- Medicamentos.
- Lotes.
- Movimientos de inventario.
- Entradas.
- Salidas.
- Ajustes.
- Stock mínimo.
- Alertas.
- Fechas de vencimiento.
- Reportes de inventario.
- Kardex de movimientos.

Estas funcionalidades se han desarrollado principalmente a nivel de backend.

La integración completa de todas ellas con el frontend continúa en proceso.

### 6.2. Endpoints principales

```http
GET    /medicamentos/
POST   /medicamentos/
GET    /alertas/
```

Otros endpoints desarrollados incluyen:

```text
/lotes/
/movimientos/
/alertas/verificar-vencimientos/
/alertas/reporte-stock-critico/
/alertas/reporte-vencimientos/
/movimientos/reporte-kardex/
```

### 6.3. Registro de medicamentos

El frontend permite registrar medicamentos mediante un formulario.

Los campos disponibles son:

- Nombre.
- Principio activo.
- Presentación.
- Código de barras.
- Registro sanitario.
- Stock mínimo.
- Unidad de medida.
- Descripción.

El formulario envía una solicitud HTTP POST al microservicio.

El backend valida los datos y guarda el registro en la base de datos.

**Importante:** Registrar un medicamento no equivale a ingresar existencias físicas. El stock real debe controlarse mediante lotes y movimientos de inventario.

### 6.4. Funcionalidades pendientes en el frontend

- Editar medicamentos.
- Gestionar categorías.
- Gestionar laboratorios.
- Registrar lotes.
- Registrar movimientos.
- Consultar existencias por lote.
- Mostrar vencimientos.
- Administrar alertas.

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
GET    /ventas/
POST   /ventas/
GET    /ventas/{id}/
PUT    /ventas/{id}/
DELETE /ventas/{id}/
```

### 7.5. Estado de integración

El microservicio de ventas ya responde a solicitudes desde el frontend.

El Dashboard consulta las ventas registradas.

Sin embargo, todavía falta implementar el flujo completo de ventas desde la interfaz web y su integración automática con el stock de inventario.

---

## 8. Microservicio de Usuarios

**Nombre:** `mc-usuarios`

### 8.1. Funcionalidades implementadas

- Autenticación de usuarios.
- Generación de tokens JWT.
- Consulta del usuario autenticado.
- Consulta de usuarios registrados.
- Identificación de roles.
- Integración con el frontend.

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

### 8.4. Mejoras pendientes

- Aplicar permisos específicos por rol en cada operación.
- Mejorar la gestión de expiración y renovación de tokens.
- Fortalecer la seguridad del almacenamiento de sesión.
- Implementar auditoría de acciones.
- Realizar pruebas de seguridad.

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

### 9.5. Funcionalidades pendientes del frontend

- Edición de medicamentos.
- Eliminación lógica o desactivación.
- Gestión de lotes.
- Gestión de proveedores.
- Control de stock.
- Gestión de ventas.
- Alertas visuales.
- Reportes.
- Auditoría.
- Administración completa de usuarios.

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

**Estado: PENDIENTE DE INTEGRACIÓN COMPLETA.**

Este diagrama representa el comportamiento previsto, no un flujo transaccional que ya esté terminado.

La integración deberá contemplar validación de existencias, errores de comunicación, concurrencia y consistencia de datos.

---

## 11. Tecnologías utilizadas

| Tecnología | Uso | Estado |
|---|---|---|
| Python | Backend | Implementado |
| Django | Microservicios | Implementado |
| Django REST Framework | APIs REST | Implementado |
| PostgreSQL | Persistencia de inventario | Implementado |
| SQLite | Base de datos inicial de ventas | En desarrollo |
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
| API Gateway | Entrada centralizada | Pendiente |
| Códigos QR | Digitalización | Pendiente de integración |

---

## 12. Estructura del proyecto

```text
farmacia-diaz-erp/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── inventarioApi.ts
│   │   │   └── ventasApi.ts
│   │   │
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── InventarioPage.tsx
│   │   │   └── RegistrarMedicamentoPage.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── inventarioService.ts
│   │   │   └── ventasService.ts
│   │   │
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── services/
│   ├── mc-inventario/
│   ├── mc-ventas/
│   └── mc-usuarios/
│
├── docker-compose.yml
└── README.md
```

Esta estructura muestra los componentes principales del proyecto.

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

Los microservicios pueden requerir variables de entorno y configuración de bases de datos.

Antes de ejecutar el proyecto en otro equipo, deben configurarse las credenciales y los servicios correspondientes.

No se deben publicar contraseñas, claves secretas ni archivos `.env` con datos sensibles.

### 13.4. Iniciar los contenedores

Desde la carpeta principal:

```bash
docker compose up -d
```

Para revisar el estado:

```bash
docker compose ps
```

### 13.5. Iniciar el frontend

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

Abrir:

```text
http://localhost:5173
```

### 13.6. Compilar el frontend

```bash
pnpm build
```

La compilación permite verificar errores de TypeScript y generar los archivos de producción del frontend.

---

## 14. Puertos de desarrollo

Durante las pruebas locales se utilizan:

| Servicio | Dirección |
|---|---|
| Frontend | http://localhost:5173 |
| Inventario | http://127.0.0.1:8000 |
| Ventas | http://127.0.0.1:8001 |
| Usuarios | http://127.0.0.1:8002 |

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

### 15.6. Pruebas pendientes

- Pruebas completas de integración.
- Pruebas de concurrencia.
- Pruebas de permisos.
- Pruebas de seguridad.
- Pruebas de rendimiento.
- Validación integral de ventas y stock.
- Pruebas de aceptación con usuarios.

---

## 16. Plan de desarrollo

### Etapa 1. Backend de inventario

**Estado: IMPLEMENTADO EN GRAN PARTE**

- Medicamentos.
- Categorías.
- Laboratorios.
- Lotes.
- Movimientos.
- Alertas.
- Reportes.
- Tareas automáticas.

### Etapa 2. Backend de ventas

**Estado: IMPLEMENTADO PARCIALMENTE**

- Registro de ventas.
- Detalles de venta.
- Cálculos.
- Consultas.

Pendiente:

- Integración automática con inventario.
- Validación de stock.
- Manejo de transacciones distribuidas.
- Pruebas de integración.

### Etapa 3. Usuarios y autenticación

**Estado: IMPLEMENTADO PARCIALMENTE**

- Login.
- JWT.
- Consulta de usuarios.
- Identificación de roles.

Pendiente:

- Permisos detallados.
- Gestión completa de usuarios.
- Auditoría y mejoras de seguridad.

### Etapa 4. Frontend

**Estado: EN DESARROLLO**

Implementado:

- Login.
- Dashboard.
- Inventario.
- Registro de medicamentos.

En proceso:

- Edición de medicamentos.
- Gestión de lotes.
- Ventas.
- Alertas.
- Control de stock.

### Etapa 5. Integración general

**Estado: PENDIENTE**

- Comunicación entre ventas e inventario.
- API Gateway.
- Manejo integral de errores.
- Consistencia de operaciones.
- Pruebas entre microservicios.

### Etapa 6. Digitalización y reportes

**Estado: PENDIENTE**

- Generación de códigos QR.
- Lectura de códigos de barras.
- Etiquetas de medicamentos.
- Reportes administrativos.
- Paneles de análisis.

### Etapa 7. Validación final

**Estado: PENDIENTE**

- Pruebas funcionales completas.
- Pruebas de seguridad.
- Validación con usuarios.
- Documentación final.
- Preparación para despliegue.

---

## 17. Consideraciones técnicas

### Independencia de servicios

Cada microservicio debe mantener separadas sus responsabilidades.

### Integridad de datos

Las operaciones de venta e inventario deberán garantizar que las existencias no se descuenten incorrectamente.

### Seguridad

El sistema debe reforzar la autenticación, autorización y protección de información sensible antes de utilizarse en un entorno real.

### Trazabilidad

Se prevé incorporar registros de auditoría para identificar operaciones y usuarios responsables.

### Escalabilidad

La arquitectura de microservicios permite desarrollar y desplegar componentes de manera independiente, aunque también requiere gestionar la comunicación y coordinación entre ellos.

---

## 18. Limitaciones actuales

El proyecto todavía presenta limitaciones:

- No todas las funcionalidades del backend tienen interfaz web.
- La integración de ventas con inventario está pendiente.
- No se dispone de un API Gateway.
- El control de permisos requiere mejoras.
- Las herramientas QR todavía no están integradas.
- Faltan pruebas de integración y seguridad.
- El sistema está configurado principalmente para desarrollo local.

Por estas razones, el ERP todavía no debe considerarse un sistema listo para producción.

---

## 19. Proyecto académico

**Proyecto:** Farmacia Díaz ERP

**Título:** Sistema ERP basado en microservicios con herramientas de digitalización para la gestión automatizada de inventarios en la Farmacia Díaz, Sucre – Gestión 2026.

**Área:** Desarrollo de software y sistemas de información.

**Arquitectura:** Microservicios.

**Institución:** TECBA.

**Gestión:** 2026.

**Estado:** En desarrollo.

---

## 20. Autora

**Martha Gonzales Chumacero**

Estudiante de Sistemas Informáticos.

GitHub: https://github.com/MarthaGonzalesChumacero

Repositorio: https://github.com/MarthaGonzalesChumacero/farmacia-diaz-erp

---

## 21. Conclusión

Farmacia Díaz ERP se encuentra en desarrollo y ya dispone de componentes funcionales que permiten autenticar usuarios, consultar información de distintos microservicios y registrar medicamentos desde una interfaz web.

El proyecto continuará con la administración de medicamentos, lotes, movimientos, ventas y alertas, además de la integración entre servicios y las herramientas de digitalización.

El objetivo final es disponer de un sistema ERP que contribuya a mejorar el control, la trazabilidad y la gestión automatizada del inventario de la Farmacia Díaz.
