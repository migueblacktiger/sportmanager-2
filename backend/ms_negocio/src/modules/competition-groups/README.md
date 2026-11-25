# HU-GC-04 - Grupos de competencia y sus equipos

Dos modulos: `competition-groups` (grupos de una fase) y `group-teams` (equipos de un grupo).
La tabla de grupos se llama `competition_groups` porque GROUPS es palabra reservada en MySQL 8.

## API protegida (`/negocio`)

- `POST /tournaments/:tournamentId/phases/:phaseId/groups`: `{ "groups": [{ "name" }] }`. 201.
- `GET /tournaments/:tournamentId/phases/:phaseId/groups`
- `GET|PATCH|DELETE /groups/:id` (PATCH solo cambia `name`)
- `POST /groups/:groupId/teams`: `{ "teamIds": [1, 2] }`. 201.
- `GET /groups/:groupId/teams`
- `DELETE /groups/:groupId/teams/:teamId`: retira al equipo del grupo (no lo elimina).

## Reglas

- Deben existir el torneo y la fase, y la fase debe pertenecer a ese torneo (404).
- El nombre del grupo es unico dentro de la fase, sin distinguir mayusculas ni espacios
  exteriores (decision propia; el anexo no la exige).
- Un grupo admite varios equipos. Un equipo no se repite en un grupo (UQ group+team) ni
  esta en dos grupos de la misma fase (UQ phase+team; `phase_id` repite la fase del grupo,
  que es inmutable). Ambos casos devuelven 409.
- Solo se asignan equipos que existan y esten inscritos en el torneo de la fase
  (tournament_registrations); si no, 409 / 404.
- Eliminar un grupo con equipos asignados se rechaza (409, FK RESTRICT); se retiran primero
  los equipos. En ningun caso se eliminan equipos de la plataforma.

## Limite conocido

La inscripcion se comprueba al asignar. Si despues se retira la inscripcion del equipo
(modulo existente, no modificado), la asignacion al grupo no se elimina sola.

## Persistencia

`1795651200000-CreateCompetitionGroups.ts` y `1795737600000-CreateGroupTeams.ts`.
No se han ejecutado. MySQL 8.0.16+.
