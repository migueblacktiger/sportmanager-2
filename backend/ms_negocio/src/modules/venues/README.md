# HU-GC-06 (soporte) - Escenarios

Catalogo de escenarios (sedes) donde se disputan los partidos. Capas de ms_cinema: DTO, entity,
mapper, repository, service, controller y module. Migracion `1795910400000-CreateVenues`.

## API protegida (`/negocio`)

- `POST /venues`: `{ "name", "address"?, "description"? }`. 201.
- `GET /venues`, `GET /venues/:id`
- `PATCH /venues/:id`: `name`, `address`, `description`, `active`.
- `DELETE /venues/:id`: 409 si tiene partidos asociados (FK RESTRICT); se puede desactivar.

Nombre unico sin distinguir mayusculas ni espacios exteriores (409).
