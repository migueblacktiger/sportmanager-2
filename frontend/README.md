# SportManager — Frontend Angular

Prototipo frontend para una plataforma de gestión de competencias deportivas. Incluye landing pública, pantallas de autenticación de demostración, dashboard, catálogo de deportes y un área administrativa separada para usuarios, roles, permisos y asignación de permisos.

## Requisitos
- Node.js LTS compatible con Angular 20
- npm

## Ejecutar en Visual Studio Code
1. Descomprime el proyecto y abre la carpeta `sportmanager-angular` en VS Code.
2. Abre una terminal dentro de esa carpeta.
3. Ejecuta `npm install`.
4. Ejecuta `npm start`.
5. Abre la URL local que indique Angular CLI (normalmente `http://localhost:4200`).

## Rutas de demostración
La navegación se realiza desde el menú lateral. La opción **Seguridad (DEV)** abre el módulo administrativo sin mezclar su matriz de permisos con las pantallas deportivas generales. La vista de asignación también está enlazada desde **Roles y permisos**.

## Alcance y conexión al backend
- Todo el comportamiento actual utiliza datos en memoria para permitir probar la interfaz.
- Los formularios de login/registro, OAuth, recuperación y guardado muestran mensajes de demostración; no autentican usuarios ni persisten datos.
- No incluye backend, base de datos, endpoints, tokens reales ni protección de rutas del servidor.
- Antes de producción, reemplazar datos simulados por servicios Angular `HttpClient`, configurar las URLs de API, implementar guards/interceptors según el contrato del backend y validar autorización también en el servidor.
- La entrada `Seguridad (DEV)` está visible intencionalmente durante el desarrollo. Ocultarla según rol y proteger las rutas cuando exista autenticación real.

## Estructura
- `src/app/app.component.ts`: datos de demostración y acciones de UI.
- `src/app/app.component.html`: vistas y formularios.
- `src/styles.css`: sistema visual responsive oscuro con acentos cian/verde.
