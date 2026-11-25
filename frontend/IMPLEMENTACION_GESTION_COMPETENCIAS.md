# SportManager - Gestión de competencias

Se agregó el acceso agrupado **Gestión de competencias** con seis secciones:

- Fases del torneo (HU-GC-03)
- Grupos de competencia (HU-GC-04)
- Fases finales (HU-GC-05)
- Gestión de partidos (HU-GC-06)
- Resultados y anotaciones (HU-GC-07)
- Desarrollo del torneo (HU-GC-08)

## Archivos nuevos

- `src/app/features/competitions/competitions-api.service.ts`
- `src/app/features/competitions/competitions-management.component.ts`
- `src/app/features/competitions/competitions-management.component.html`
- `src/app/features/competitions/competitions-management.component.css`

## Archivos existentes modificados

- `src/app/app.component.ts`: registro del componente y navegación interna.
- `src/app/app.component.html`: acceso agrupado en el menú y renderizado de la vista.
- `src/styles.css`: estilos del submenú.

## Integración

Se reutiliza `NEGOCIO_API_URL` y la infraestructura HTTP/interceptores existente. Las solicitudes usan los endpoints expuestos por los módulos del backend compartido. La selección de equipos se limita a los equipos activos inscritos en el torneo; las reglas finales también son validadas por el backend.

## Puesta en marcha

Desde la carpeta del frontend, ejecutar `npm ci` y luego `npm run start`. No se incluye `node_modules`, caché ni `dist` en este paquete. Las migraciones de base de datos y los permisos requeridos por el backend deben estar aplicados/configurados antes de probar las operaciones.
