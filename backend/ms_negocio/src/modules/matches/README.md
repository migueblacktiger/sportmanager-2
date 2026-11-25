# HU-GC-05 (soporte) - Partidos de una fase

Modulo minimo que permite que los partidos pertenezcan a una fase y, por tanto, que los partidos de una
fase final se identifiquen como parte de ella. No define marcadores, resultados ni calendario: solo el
vinculo partido-fase-equipos. Capas de ms_cinema/TournamentRegistrations (DTO, entity, mapper,
repository con UnitOfWork transaccional, service, controller, errores propios y filtro HTTP).

## API protegida (`/negocio`)

- `POST /phases/:phaseId/matches`: `{ "homeTeamId", "awayTeamId", "scheduledAt" }`. 201.
- `GET /phases/:phaseId/matches`: partidos de la fase ordenados por fecha.
- `GET /matches/:id`
- `DELETE /matches/:id`: elimina solo el partido (la fase y los equipos se conservan).

Respuesta: `id, phaseId, phaseName, phaseType, tournamentId, isFinalPhase, homeTeamId, homeTeamName,
awayTeamId, awayTeamName, scheduledAt` (ISO UTC). `isFinalPhase` es true cuando la fase es de tipo final.

## Reglas

- La fase debe existir (404). Los equipos deben existir (404) y estar inscritos en el torneo de la fase (409).
- Local y visitante deben ser distintos (400; ademas CHECK en la migracion).
- `scheduledAt` es una fecha ISO con zona horaria (Z o +hh:mm), como las fechas de torneos.
- Bloqueos en el orden torneo (compartido), fase (compartido), equipos (por id): una fase no se elimina ni
  se retiran inscripciones mientras se crea un partido.
- Una fase con partidos no se puede eliminar: FK `RESTRICT` y comprobacion explicita en `final-phases`.

## Decisiones propias (el enunciado no las define)

- Campos minimos: fase, equipo local, equipo visitante y fecha. Marcador, estado, sede o arbitros se
  agregaran con su propia historia.
- No se valida que la fecha caiga dentro del periodo del torneo ni se impide programar el mismo cruce dos veces.
- No hay PATCH de partidos: para corregir uno se elimina y se crea de nuevo.

## Persistencia

`1795824000000-CreateMatches.ts`. No se ha ejecutado. MySQL 8.0.16+ (CHECK).
