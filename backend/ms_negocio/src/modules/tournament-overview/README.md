# HU-GC-08 - Consultar desarrollo de un torneo

Modulo nuevo `tournament-overview`, **solo lectura**: no crea tablas ni migraciones y **no modifica** ningun
modulo, entidad o migracion existente. La unica edicion fuera de esta carpeta es su registro en `AppModule`.
Para seleccionar el torneo se reutiliza `GET /tournaments` (modulo `tournaments`).

## API protegida (`/negocio`)

`GET /tournaments/:tournamentId/overview?includeAnnotations=true|false` (por defecto `false`). 404 si el torneo
no existe; 400 si `includeAnnotations` no es `true` o `false` o llega otro parametro.

Respuesta:

- `tournament`: `id, name, sportId, sportName, registrationStartsAt, registrationEndsAt, startsAt`.
- `summary`: `phases, groups, matches, matchesWithResult, matchesPending`.
- `phases[]` (por `order`): `id, name, type, order, isFinalPhase, groups[], standings, bracket, matchSummary, matches[]`.
  - `groups[]`: `id, name, teams[{id,name}], standings[]` (tabla de posiciones del grupo).
  - `standings`: tabla de la fase solo si es `league`; `null` en las demas.
  - `bracket`: `{ round, ties[] }` para fases `knockout` y `final` (cada partido es una llave con marcador y
    ganador); `null` en las demas.
  - `matches[]`: `id, phaseId, groupId, homeTeam, awayTeam, scheduledAt, status, venue, resultStatus
    ("registered" | "pending"), result | null, annotations | null`.
- Fila de tabla de posiciones: `position, teamId, teamName, played, won, drawn, lost, goalsFor, goalsAgainst,
  goalDifference, points`.

Las anotaciones de un partido tambien se consultan con `GET /tournaments/:tournamentId/matches/:matchId/annotations`
(modulo `match-results`, sin cambios); con `includeAnnotations=true` vienen dentro de cada partido, por minuto.

## Criterios de aceptacion

| Criterio | Como se cumple |
| --- | --- |
| Seleccionar un torneo registrado | `GET /tournaments` lista; `/tournaments/:id/overview` devuelve 404 si no existe |
| Informacion general | bloque `tournament` y `summary` |
| Fases que conforman la competencia | `phases[]` ordenadas por `order`, con tipo y `isFinalPhase` |
| Grupos y equipos de cada grupo | `phases[].groups[].teams` |
| Tabla de posiciones si son grupos | `groups[].standings` (y `phases[].standings` en fases `league`) |
| Fase final a manera de llaves | `phases[].bracket` en fases `knockout` y `final` |
| Partidos de cada fase | `phases[].matches` |
| Resultados registrados vs pendientes | `resultStatus` por partido y `matchSummary` por fase |
| Anotaciones por partido | `includeAnnotations=true` o el endpoint de `match-results` |
| Solo informacion del torneo | todo se consulta desde las fases del torneo y el armado descarta lo ajeno |

## Decisiones propias (el enunciado no las define)

- Posiciones: 3 puntos por victoria, 1 por empate, 0 por derrota. Orden: puntos, diferencia de gol, goles a
  favor, nombre. La posicion es el lugar en la lista (no hay posiciones compartidas).
- Solo cuentan los partidos `finished` con resultado registrado. En un grupo solo cuentan partidos entre
  equipos de ese grupo; un equipo sin partidos aparece en cero.
- En fases `league` (sin grupos) los equipos salen de los partidos de la fase.
- Pendiente = partido sin resultado registrado, cualquiera sea su estado (un cancelado se ve por `status`).
- `winnerTeamId` solo con el partido `finished` y marcador distinto; un empate no tiene ganador (no se
  modelan penales ni avance automatico entre rondas: cada partido es una llave y la ronda es el `order` de la fase).
- Un partido sin fila en `match_details` se considera `scheduled`, igual que `match-management`.
- La lectura usa una transaccion `REPEATABLE READ`, asi la vista es coherente aunque se registren datos mientras
  se consulta.

## Pendientes de despliegue

No hay migraciones nuevas. El permiso de la ruta nueva esta en el catalogo
`BusinessPermissionsInitializer` de ms_security; su seed explicito agrega el
permiso al rol Administrador sin ejecutarse en arranques normales.
