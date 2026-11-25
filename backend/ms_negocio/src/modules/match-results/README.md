# HU-GC-07 - Resultados y anotaciones de los partidos

El modulo `match-results` gestiona los resultados y las anotaciones. Reutiliza el estado del partido
(`match_details`) y los helpers de fechas de contratos de `player-teams`. La finalizacion por la ruta de
estado de `match-management` tambien notifica el resumen si el partido ya tiene resultado.

## API protegida (`/negocio`)

Resultado (uno por partido):

| Ruta | Descripcion |
| --- | --- |
| `POST /tournaments/:tournamentId/matches/:matchId/result` | `{ scores: [{teamId, score}, {teamId, score}], finalize? }`. 201 |
| `GET  /tournaments/:tournamentId/matches/:matchId/result` | Consulta el resultado |
| `PATCH /tournaments/:tournamentId/matches/:matchId/result` | `scores` y/o `finalize: true` |

Anotaciones:

| Ruta | Descripcion |
| --- | --- |
| `POST   .../matches/:matchId/annotations` | `{ playerId, teamId?, minute?, points?, description? }`. 201 |
| `GET    .../matches/:matchId/annotations` | Anotaciones del partido por minuto |
| `GET    .../matches/:matchId/annotations/:id` | Detalle |
| `PATCH  .../matches/:matchId/annotations/:id` | Cualquiera de los campos anteriores (`minute` y `description` aceptan null) |
| `DELETE .../matches/:matchId/annotations/:id` | Elimina solo la anotacion |

Audiencias que reciben notificaciones:

| Ruta | Descripcion |
| --- | --- |
| `POST /matches/:matchId/audiences/tickets` | `{ fanId }`; registra un boleto confirmado |
| `GET /matches/:matchId/audiences/tickets` | Consulta aficionados con boleto registrado |
| `DELETE /matches/:matchId/audiences/tickets/:fanId` | Retira la relacion (por ejemplo, boleto reembolsado) |
| `POST /matches/:matchId/audiences/bets` | `{ fanId }`; registra una apuesta confirmada |
| `GET /matches/:matchId/audiences/bets` | Consulta aficionados con apuesta registrada |
| `DELETE /matches/:matchId/audiences/bets/:fanId` | Retira la relacion (por ejemplo, apuesta anulada) |

Las rutas POST son idempotentes para la combinacion partido/aficionado/fuente. Solo Administrador tiene
permisos por defecto. Los sistemas de boleteria/apuestas deben invocar el registro despues de confirmar la
operacion; estos endpoints no procesan pagos, emiten boletos ni liquidan apuestas.

Respuesta de resultado: `id, matchId, tournamentId, matchStatus, homeTeamId, homeTeamName, homeScore,
awayTeamId, awayTeamName, awayScore, winnerTeamId (null si hay empate), updatedAt`. POST y PATCH agregan
`notification` (`recipients, sent, failed, skipped, reason?`, o `null` si no correspondia notificar).
Respuesta de anotacion: `id, matchId, tournamentId, playerId, playerName, teamId, teamName, minute, points,
description, createdAt`; el POST agrega `notification`.

## Criterios de aceptacion

| Criterio | Como se cumple |
| --- | --- |
| Partido previamente registrado | 404 si falta el torneo, el partido, o el partido es de otro torneo |
| Registrar el resultado de los equipos participantes | `scores` lleva exactamente un marcador por equipo (local y visitante), en cualquier orden |
| Solo equipos que participan | Un `teamId` ajeno al partido responde 400; repetido o faltante, 400 |
| Consultar y modificar segun reglas | GET/PATCH; solo con el partido `in_progress` o `finished` (409 en otro estado) |
| Resultado asociado al partido | `match_results.match_id` UNIQUE + FK `matches` RESTRICT |
| Una o varias anotaciones por partido | POST repetible; `match_annotations.match_id` |
| Anotacion asociada al jugador | `player_id` obligatorio; FK `players` RESTRICT |
| Jugador de un equipo participante | Debe tener un contrato (`player_teams`) vigente en la fecha del partido con el local o el visitante; `team_id` queda guardado. Si pertenece a ambos, `teamId` es obligatorio (409 si falta) |
| Consultar, modificar, eliminar anotaciones | GET lista/detalle, PATCH, DELETE |
| Eliminar no borra jugador ni partido | `DELETE` toca solo `match_annotations`; todas las FK son RESTRICT |
| Se conserva la relacion con partido y jugador | Las FK impiden borrar el partido, el equipo o el jugador mientras existan anotaciones |
| Notificar cada anotacion | Despues de confirmar la transaccion, correo a los aficionados con boleto o apuesta |
| Resumen al finalizar con resultado | Ver abajo |

## Finalizacion y resumen

`finalize: true` (en POST o PATCH) guarda el resultado y pasa el partido de `in_progress` a `finished` en la
misma transaccion. El resumen (marcador, torneo, fase y todas las anotaciones) se envia una sola vez:

- cuando el partido pasa a `finished` con `finalize: true`, o
- cuando se registra por primera vez el resultado de un partido que ya estaba `finished` (por ejemplo,
  finalizado antes con `PATCH .../matches/:id/status` del modulo `match-management`), o
- cuando `PATCH .../matches/:id/status` cambia a `finished` un partido que ya tiene resultado.

Corregir despues el marcador de un partido finalizado esta permitido y no reenvia el resumen.

## Reglas y decisiones propias (el enunciado no las define)

- "Reglas de la competencia": resultado y anotaciones se crean o modifican solo con el partido `in_progress` o
  `finished`. Eliminar una anotacion se permite en cualquier estado (para poder depurar partidos cancelados).
- Marcador entero 0-1000. Anotacion: `points` 1-100 (por defecto 1), `minute` 0-300 opcional, `description`
  hasta 255. El resultado no se calcula a partir de las anotaciones ni se contrasta con ellas.
- Pertenencia del jugador: contrato vigente en `scheduledAt` del partido, con la misma semantica de fechas
  inclusivas en hora de Bogota y retirada anticipada (`finishedAt`) de `player-teams`. No se exige que el
  jugador o el equipo esten activos.
- Los partidos con resultado o anotaciones no se pueden eliminar (FK RESTRICT): `match-management` ya traduce
  ese caso a 409. `DELETE /matches/:id` del modulo base devuelve el error de BD sin traducir (limite conocido).

## Notificaciones y dependencias externas

El modulo `match-audiences` mantiene relaciones confirmadas partido/aficionado para boletos y apuestas. El
notificador combina ambas fuentes, deduplica correos y resuelve los IDs de usuario mediante `ms_security`.
Variables de entorno:

| Variable | Uso |
| --- | --- |
| `MAIL_SERVICE_URL`, `MAIL_SERVICE_TOKEN` | Correo, igual que `match-management` |
| `FAN_DIRECTORY_PATH` | Resuelve el correo cuando la fuente solo informa ids, igual que `match-management` |

Si `MAIL_SERVICE_URL` no esta configurada, la respuesta marca `skipped: true`. Si un correo falla, el partido,
resultado o anotacion ya guardados no se revierten; el resumen de notificacion reporta los fallos.

## Persistencia

Orden: `1796169600000-CreateMatchResults`, `1796256000000-CreateMatchAnnotations` y
`1796342400000-CreateMatchAudiences`. Requieren las tablas `matches`, `players` y `teams`. MySQL 8.0.16+
(CHECK). `synchronize: false` y `migrationsRun: false` se mantienen.

## Pendientes de despliegue

Verificar que las 3 migraciones esten aplicadas y que ms_security tenga permisos para las 14 rutas de resultados,
anotaciones y audiencias: result POST/GET/PATCH, annotations POST/GET (lista), GET (detalle), PATCH, DELETE y
audiencias GET/POST/DELETE para boletos y apuestas. Los sistemas que confirmen compras o apuestas deben llamar
a las rutas POST de audiencia para que esos aficionados reciban notificaciones.
