# HU-GC-05 - Gestionar fases finales

Opera sobre la tabla existente `tournament_phases` (entidad `TournamentPhase`) filtrando siempre
`type = 'final'`; no requiere migracion propia. No modifica el modulo `tournament-phases`. Los partidos
vienen del modulo `matches` (migracion `1795824000000-CreateMatches`).

## API protegida (`/negocio`)

- `POST /tournaments/:tournamentId/final-phases`: `{ "name", "order" }`. 201. El tipo es siempre `final`.
- `GET /tournaments/:tournamentId/final-phases`: fases finales ordenadas por `order`, con `matchCount`.
- `GET /tournaments/:tournamentId/final-phases/:id`
- `PATCH /tournaments/:tournamentId/final-phases/:id`: `name` y/o `order`.
- `DELETE /tournaments/:tournamentId/final-phases/:id`
- `GET /tournaments/:tournamentId/final-phases/:id/matches`: partidos de la fase final (`isFinalPhase: true`).

Respuesta: `id, tournamentId, name, type ("final"), order, matchCount`.

## Criterios de aceptacion

| Criterio | Como se cumple |
| --- | --- |
| El torneo debe existir | 404 si no existe, en todas las rutas |
| Registrar una fase final | POST; tipo forzado a `final`; el orden es unico en el torneo (409) |
| Consultar | GET lista y detalle; una fase de otro tipo u otro torneo es 404 |
| Actualizar segun reglas | Nombre siempre editable; el orden queda bloqueado si hay partidos (409) |
| Eliminar sin partidos ni info asociada | 409 con partidos; 409 con grupos (FK RESTRICT); si no, se elimina |
| Partidos identificables como fase final | `matches.phase_id` + `isFinalPhase`; endpoint `/final-phases/:id/matches` |
| No afectar otras fases | Solo se lee/escribe la fila de la fase; el orden se valida sin reordenar nada |

## Decisiones propias

- Se admiten varias fases finales por torneo (p. ej. semifinal, tercer puesto y final); la HU habla de
  "fases finales" en plural.
- "Reglas de la competencia" se interpreto como: una fase final con partidos conserva su orden; el
  nombre se puede corregir siempre. El tipo y el torneo nunca cambian desde este modulo.
- No se impone que la fase final sea la ultima por orden ni que el torneo no haya iniciado.
- Bloqueo en el orden torneo y luego fase (como `tournament-phases`); el conteo de partidos se hace con la
  fase bloqueada y la creacion de partidos espera ese bloqueo.

## Limite conocido: rutas genericas de fases

`PATCH /phases/:id` y `DELETE /phases/:id` (modulo existente, no modificado) siguen aceptando fases de
cualquier tipo y no conocen las reglas de esta historia: pueden cambiar el orden o el tipo de una fase final
con partidos. La eliminacion si queda protegida por la FK `matches.phase_id` (responde 409). Para aplicar
las reglas completas, usar las rutas `/final-phases`, o restringir en seguridad el acceso a `/phases/{id}`.

## Pendientes de despliegue

Ejecutar la migracion de `matches` (no se ejecuto) y registrar en ms_security los permisos de las rutas
nuevas: 6 de `final-phases` y 4 de `matches` (parametros `{tournamentId}`, `{id}`, `{phaseId}`).
