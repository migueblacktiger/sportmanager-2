# HU-GD-04 - Jugadores

Sigue las capas y convenciones de Teams y de ms_cinema. El Anexo 2 no define
campos personales concretos. Se acordaron nombre obligatorio e identificacion
opcional unica; no se exigen documento nacional, correo, fecha de nacimiento
ni cuenta de autenticacion.

## Contrato

- `id`: entero autoincremental interno.
- `name`: obligatorio, hasta 180 caracteres, no admite solo espacios.
- `identification`: opcional/null, hasta 80 caracteres, no admite solo espacios.
  MySQL genera `normalized_identification` con LOWER(TRIM(identification)).
  Un indice unico ignora mayusculas y espacios exteriores, incluso para
  jugadores inactivos. Permite varios NULL. No elimina puntuacion ni espacios
  interiores, ni impone unicidad de nombres.
- `description`: texto opcional/null, hasta 65535 bytes UTF-8.
- `active`: true por defecto; PATCH permite true/false.

POST y GET `/negocio/players`; GET, PATCH y DELETE `/negocio/players/:id`.
POST devuelve 201; las otras operaciones, 200. DELETE devuelve un mensaje.
Los identificadores deben ser enteros positivos hasta 2147483647.
Las rutas heredan SecurityGuard y requieren JWT y permisos remotos.

## Persistencia y despliegue pendiente

`1795305600000-CreatePlayers.ts` crea solo players y sus restricciones;
requiere MySQL 8.0.16+ como las migraciones existentes. No se ha ejecutado.
Se conservan synchronize: false y migrationsRun: false.

No hay relacion con ms_security ni con equipos. HU-GD-05 y futuras asociaciones
deben crear sus claves foraneas hacia players con ON DELETE RESTRICT, sin
cascadas. DELETE directo permite a MySQL comprobar atomicamente esas
restricciones y el Service devuelve 409 si hay informacion asociada.
Hasta que existan esas asociaciones no hay relaciones de jugadores que consultar.

Quedan pendientes ejecutar la migracion autorizada, registrar los cinco permisos
en ms_security, comprobar con Postman y desarrollar Angular. No se cambiaron
el inicializador de permisos ni el sistema de autenticacion. El tipo/formato
institucional de identificacion puede precisarse despues si el profesor lo define.
