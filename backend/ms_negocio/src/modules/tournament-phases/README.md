# HU-GC-03 - Fases de un torneo

Capas de ms_cinema/TournamentRegistrations: DTO, entity, mapper, repository (con
UnitOfWork transaccional), service, controller, errores propios y filtro HTTP.

## API protegida (`/negocio`)

- `POST /tournaments/:tournamentId/phases`: registra una o varias fases en una sola
  transaccion. Cuerpo: `{ "phases": [{ "name", "type", "order" }] }`. Devuelve 201.
- `GET /tournaments/:tournamentId/phases`: fases del torneo ordenadas por `order`.
- `GET /phases/:id`, `PATCH /phases/:id` (name, type, order), `DELETE /phases/:id`.

## Reglas

- El torneo debe existir (404). Una fase pertenece a un unico torneo y ese vinculo no se
  puede cambiar: `tournamentId` no se acepta en PATCH.
- `type`: `groups`, `league`, `knockout` o `final` (tipo de etapa). El anexo da como
  ejemplos fase de grupos y fase final; los otros dos valores son una ampliacion razonable
  y se pueden ajustar en `dto/phase-type.ts` y en el CHECK de la migracion.
- `order`: entero >= 1, unico dentro del torneo (409 si esta ocupado). No hay intercambio
  automatico: para reordenar se libera primero el orden.
- Eliminar una fase solo elimina la fase. Si tiene grupos, la FK RESTRICT lo impide (409).
  Crear, modificar o eliminar fases nunca elimina el torneo.

## Persistencia

`1795564800000-CreateTournamentPhases.ts`. No se ha ejecutado. MySQL 8.0.16+.
