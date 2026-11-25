# HU-GC-06 - Gestionar partidos

Gestion de partidos por torneo y fase. Agrega estado, escenario, actualizacion, eliminacion con reglas,
participacion de aficionados y notificacion por correo. Las rutas base de `matches` comparten las
validaciones, persistencia, notificacion y reglas de eliminacion de este modulo.

## API protegida (`/negocio`)

Partidos (siempre dentro de un torneo existente):

| Ruta | Descripcion |
| --- | --- |
| `POST /tournaments/:tournamentId/phases/:phaseId/matches` | `{ homeTeamId, awayTeamId, scheduledAt, venueId? }`. 201. Estado inicial `scheduled`. Devuelve el partido y `notification` |
| `POST /phases/:phaseId/matches` | Ruta compatible; acepta los mismos campos, ejecuta el mismo flujo y agrega `notification` a la respuesta base |
| `GET /tournaments/:tournamentId/matches?phaseId=&teamId=&status=` | Partidos del torneo, filtros opcionales |
| `GET /tournaments/:tournamentId/phases/:phaseId/matches` | Partidos de una fase |
| `GET /tournaments/:tournamentId/matches/:id` | Detalle (fase, equipos, estado, escenario, `attendanceCount`) |
| `PATCH /tournaments/:tournamentId/matches/:id` | `homeTeamId`, `awayTeamId`, `scheduledAt`, `venueId` (null quita el escenario) |
| `PATCH /tournaments/:tournamentId/matches/:id/status` | `{ status }` segun la tabla de transiciones |
| `DELETE /tournaments/:tournamentId/matches/:id` | Elimina solo el partido si no hay participaciones ni resultado |

Participacion de aficionados (`fanId` = id del usuario en ms_security):

- `POST /matches/:matchId/attendances` `{ fanId }`, `GET /matches/:matchId/attendances`,
  `DELETE /matches/:matchId/attendances/:fanId`.

Respuesta de partido: `id, tournamentId, phaseId, phaseName, phaseType, isFinalPhase, homeTeamId,
homeTeamName, awayTeamId, awayTeamName, scheduledAt (ISO UTC), status, venue | null, attendanceCount`.

## Criterios de aceptacion

| Criterio | Como se cumple |
| --- | --- |
| Torneo y fase existen | 404 si falta el torneo o si la fase no existe / es de otro torneo |
| Registrar con la informacion requerida | POST con validacion de DTO; fase, equipos y fecha obligatorios |
| Asociado a una fase | La ruta incluye `phaseId`; `matches.phase_id` |
| Definir equipos | `homeTeamId` y `awayTeamId` |
| Un equipo no compite contra si mismo | 400 (y CHECK en `matches`) |
| Equipos habilitados | Deben existir (404), estar **activos** y **inscritos en el torneo** (409) |
| Consultar partidos / detalle | GET lista (con filtros) y GET por id |
| Actualizar segun estado | PATCH solo en `scheduled` o `postponed` (409 en otro caso) |
| Eliminar sin informacion que lo impida | 409 si esta `in_progress` o `finished`, si tiene participaciones o resultado |
| Escenario cuando corresponda | `venueId` opcional; el escenario debe existir y estar activo |
| Cambios almacenados | Transacciones con bloqueos; la respuesta se lee de la base tras confirmar |
| Correo a aficionados | Ver abajo |

## Estados

`scheduled`, `in_progress`, `finished`, `cancelled`, `postponed`. Un partido legado sin fila en
`match_details` se considera `scheduled`.
Aunque `in_progress` puede pasar a `cancelled`, no se permite cancelar un partido con resultado registrado.

| Desde | Hacia |
| --- | --- |
| scheduled | in_progress, postponed, cancelled |
| postponed | scheduled, cancelled |
| in_progress | finished, cancelled |
| finished, cancelled | (terminales) |

## Notificacion por correo

Al crear un partido se notifica, **despues de confirmar la transaccion**, a los aficionados con
participacion en partidos anteriores (`scheduled_at` anterior, no cancelados) de cualquiera de los dos
equipos. Un fallo de correo nunca deshace el partido: el resultado va en `notification`
(`recipients, sent, failed, skipped, reason?`). Cada correo se envia una sola vez por direccion.

Los aficionados se registran en ms_security y su correo se resuelve por usuario con el mismo Bearer de
la solicitud. `FAN_DIRECTORY_PATH` usa `/api/users` por defecto. El envio requiere `MS_SECURITY` y
`MAIL_SERVICE_URL`; si falta alguna, el resultado indica `skipped: true`:

| Variable | Uso |
| --- | --- |
| `FAN_DIRECTORY_PATH` | Base de consulta de usuarios en ms_security (por defecto `/api/users`) |
| `MAIL_SERVICE_URL` | URL HTTP(S) del servicio que envia correos (local: `http://127.0.0.1:5000/send-email`) |
| `MAIL_SERVICE_TOKEN` | Opcional; se envia como `Bearer` al servicio de correo |

Contratos:

- `GET ${MS_SECURITY}${FAN_DIRECTORY_PATH}/{userId}` con el mismo `Authorization`; usa el endpoint
  existente `GET /api/users/{id}` de ms_security. Las consultas se limitan a lotes de 10; usuarios
  eliminados (404) se omiten.
- `POST ${MAIL_SERVICE_URL}` con `{ "to", "subject", "text", "html" }`; cualquier 2xx es envio correcto.

## Persistencia

Orden de migraciones relacionadas: `...-CreateVenues`, `1795996800000-CreateMatchDetails`,
`1796083200000-CreateMatchAttendances`.

- `match_details`: 1-1 con `matches` (estado, `venue_id`). FK a `matches` con CASCADE: eliminar el partido
  elimina su detalle, asi `DELETE /matches/:id` del modulo base sigue funcionando.
- `match_attendances`: FK a `matches` **RESTRICT**; `fan_id` sin FK (usuario de ms_security).

## Decisiones propias (el enunciado no las define)

- "Habilitado" = equipo activo e inscrito en el torneo.
- Participacion solo en partidos `in_progress` o `finished`; no se valida que el aficionado exista en ms_security.
- No se impide el mismo cruce dos veces ni dos partidos en el mismo escenario y hora.
- Al cambiar solo la fecha no se revalidan equipos ya asignados.

## Limites conocidos

Ambas rutas de creacion envian el Bearer de la solicitud a ms_security para resolver contactos.
`DELETE /matches/:id` reutiliza las reglas de eliminacion del modulo de gestion. En ambas rutas la
proteccion de permisos sigue dependiendo de ms_security.

## Pendientes de despliegue

Ejecutar las 3 migraciones (MySQL 8.0.16+). Los permisos de estas rutas estan incluidos en el catalogo
aditivo de `BusinessPermissionsInitializer`; el procedimiento explicito para agregarlos al rol
Administrador esta en el README raiz.
