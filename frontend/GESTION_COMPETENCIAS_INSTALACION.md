# SportManager – Gestión de competencias (HU-GC-03 a HU-GC-08)

## Alcance implementado

Se incorporó el acceso agrupado **Gestión de competencias** al menú lateral. Sus seis secciones son:

1. Fases del torneo (HU-GC-03).
2. Grupos de competencia (HU-GC-04).
3. Fases finales (HU-GC-05).
4. Gestión de partidos (HU-GC-06).
5. Resultados y anotaciones (HU-GC-07).
6. Desarrollo del torneo (HU-GC-08).

Se conservaron los módulos funcionales anteriores. La integración con el shell de la aplicación se limita a registrar el componente, el acceso de menú y la selección de la sección inicial.

## Archivos agregados

- `src/app/features/competitions/competitions-api.service.ts`
- `src/app/features/competitions/competitions-management.component.ts`
- `src/app/features/competitions/competitions-management.component.html`
- `src/app/features/competitions/competitions-management.component.css`

## Archivos existentes modificados

- `src/app/app.component.ts`
- `src/app/app.component.html`
- `src/styles.css`

No se modificaron los componentes, servicios ni estilos de los módulos funcionales preexistentes.

## Integración API

El nuevo servicio reutiliza `NEGOCIO_API_URL` (`http://localhost:3001/negocio`) y la infraestructura HTTP/interceptores ya configurada. Consume los controladores entregados para fases, grupos, asignación de equipos, fases finales, partidos, escenarios, resultados, anotaciones y resumen del torneo. También consulta los contratos jugador-equipo para limitar la selección de anotadores a jugadores que pertenecen a los equipos participantes en la fecha del partido.

Las restricciones definitivas se mantienen en el backend. Los errores de validación o de reglas de negocio se muestran en la interfaz.

## Verificación realizada

- TypeScript: `tsc -p tsconfig.app.json --noEmit` — correcto.
- Angular compiler y verificación de plantillas: `ngc -p tsconfig.app.json --noEmit` — correcto.
- No fue posible ejecutar el empaquetado final ni las pruebas MJS en este entorno: el `node_modules` recibido contiene el binario nativo de esbuild para Windows, mientras el entorno de validación es Linux. En tu equipo se deben reinstalar dependencias para la plataforma local.
- No se probaron operaciones HTTP contra una instancia activa de `ms_negocio` ni contra la base de datos.

## Puesta en marcha del frontend

Usar Node.js **24.12 o superior** para ajustarse a las versiones de Firebase presentes en el lockfile.

```bash
npm ci
npm run start
```

Antes de validar los módulos, confirmar que `ms_negocio` esté disponible en `http://localhost:3001/negocio` y que el usuario autenticado tenga los permisos correspondientes.

## Requisitos de despliegue del backend

Las migraciones del ZIP de `ms_negocio` no estaban ejecutadas según la documentación de los módulos. Aplicarlas en este orden desde la carpeta del backend, con la base de datos configurada:

1. `1795564800000-CreateTournamentPhases.ts`
2. `1795651200000-CreateCompetitionGroups.ts`
3. `1795737600000-CreateGroupTeams.ts`
4. `1795824000000-CreateMatches.ts`
5. `1795910400000-CreateVenues.ts`
6. `1795996800000-CreateMatchDetails.ts`
7. `1796083200000-CreateMatchAttendances.ts`
8. `1796169600000-CreateMatchResults.ts`
9. `1796256000000-CreateMatchAnnotations.ts`

Comando definido por el backend:

```bash
npm run migration:run
```

No ejecutar migraciones en producción sin respaldo y revisión previa del estado de la base de datos.

### Permisos

En `ms_security`, asignar al rol administrador los permisos de los endpoints nuevos bajo `/negocio`. Como mínimo, deben cubrir:

- Fases: `POST/GET /tournaments/{tournamentId}/phases`, `GET /phases/{id}`, `PATCH /phases/{id}`, `DELETE /phases/{id}`.
- Grupos: `POST/GET /tournaments/{tournamentId}/phases/{phaseId}/groups`, `GET/PATCH/DELETE /groups/{id}`.
- Equipos de grupos: `POST/GET /groups/{groupId}/teams`, `DELETE /groups/{groupId}/teams/{teamId}`.
- Fases finales: `POST/GET /tournaments/{tournamentId}/final-phases`, `GET/PATCH/DELETE /tournaments/{tournamentId}/final-phases/{id}`.
- Partidos: `POST /tournaments/{tournamentId}/phases/{phaseId}/matches`, `GET /tournaments/{tournamentId}/phases/{phaseId}/matches`, `GET /tournaments/{tournamentId}/matches`, `GET/PATCH/DELETE /tournaments/{tournamentId}/matches/{id}`, `PATCH /tournaments/{tournamentId}/matches/{id}/status`.
- Escenarios: `GET /venues`.
- Contratos jugador-equipo: `GET /player-teams/teams/{teamId}`.
- Resultados: `POST/GET/PATCH /tournaments/{tournamentId}/matches/{matchId}/result`.
- Anotaciones: `POST/GET /tournaments/{tournamentId}/matches/{matchId}/annotations`, `GET/PATCH/DELETE /tournaments/{tournamentId}/matches/{matchId}/annotations/{id}`.
- Desarrollo del torneo: `GET /tournaments/{tournamentId}/overview`.

También deben estar habilitados los permisos preexistentes usados para consultar torneos, equipos, jugadores e inscripciones: `GET /tournaments`, `GET /teams`, `GET /players` y `GET /tournaments/{tournamentId}/registrations`.

### Notificaciones

Los controladores de backend realizan los envíos después de confirmar las transacciones, pero el envío puede omitirse si los adaptadores externos no están configurados. Revisar las variables documentadas en `ms_negocio`:

- `FAN_DIRECTORY_PATH`
- `MAIL_SERVICE_URL`
- `MAIL_SERVICE_TOKEN` (opcional)
- `MATCH_TICKETS_URL`
- `MATCH_BETS_URL`

La interfaz muestra el resumen de notificaciones devuelto por el backend cuando el endpoint lo incluye. La entrega real de correos depende de los servicios externos.
