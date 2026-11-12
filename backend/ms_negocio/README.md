# SportManager - ms_negocio

Proyecto NestJS independiente, basado en el ms_cinema del profesor. Requiere
Node.js 24 o superior y MySQL. No contiene entidades deportivas, CRUD ni
migraciones ejecutables; no se ha creado ni modificado ninguna base de datos.

## Estructura

- `src/main.ts`: prefijo global `/negocio` y ValidationPipe global con
  whitelist, forbidNonWhitelisted y transform, como ms_cinema.
- `src/app.*`: modulo principal y GET publico `/negocio`, que identifica el
  servicio; no representa una comprobacion de disponibilidad de ms_security.
- `src/config`: validacion de entorno, opciones MySQL compartidas y DatabaseModule.
- `src/common`: CommonModule registra SecurityGuard global via APP_GUARD,
  decorador Public y contratos de validacion remota.
- `src/migrations`: reservado para migraciones con timestamp, MigrationInterface,
  QueryRunner, up y down, como el profesor. Esta vacio de migraciones ejecutables.
- `src/modules`: instrucciones para crear cada funcionalidad con DTO, entity,
  mapper, repository, service, controller y module cuando se disene el dominio.
- `typeorm.config.ts`: DataSource independiente para la CLI de migraciones.

Se mantienen las versiones principales del ejemplo y su configuracion TypeScript
estricta/Nest CLI. Se omiten cine, WebSockets, despliegue y telemetria. No se copia
el .env del profesor. Runtime y CLI comparten opciones; ambos desactivan
`synchronize` y `migrationsRun`, incluso en desarrollo. La CLI usa ts-node como
el patron TypeORM del ejemplo y carga `src/migrations/*{.ts,.js}`.

## Entorno y ejecucion

Desde `backend/ms_negocio`:

```powershell
npm ci
Copy-Item .env.example .env
# Editar .env con valores locales antes de arrancar.
npm run build
npm run typecheck
npm test
npm run start:dev
# Para ejecutar el build: npm run start:prod
```

No registrar `.env` en Git. El lockfile permite instalar las versiones resueltas.
Las dependencias utilizadas para verificar esta estructura provienen del
node_modules incluido en el ZIP de referencia; no es necesario conservarlo en Git.

| Variable | Uso |
| --- | --- |
| PORT | Puerto de negocio; ejemplo 3001 |
| DB_HOST | Host MySQL; por defecto 127.0.0.1 |
| DB_PORT | Puerto MySQL; por defecto 3306 |
| DB_USERNAME | Usuario MySQL propio de negocio, obligatorio |
| DB_PASSWORD | Contrasena local, obligatoria; sin valor real en el ejemplo |
| DB_DATABASE | Base independiente: sportmanager_negocio_db en el ejemplo |
| MS_SECURITY | Origen de seguridad, por ejemplo http://localhost:8181, sin /api |
| SECURITY_TIMEOUT_MS | Timeout remoto; por defecto 5000 ms, rango 1-60000 |

Para arrancar se necesita una base de negocio existente y accesible. Su creacion
manual y la asignacion de un usuario propio quedan para la preparacion del entorno;
esta tarea no las ejecuta. Nunca configurar DB_DATABASE con la base de ms_security.
El arranque abre conexion MySQL, pero no crea tablas ni aplica migraciones.
La compilacion, typecheck y las pruebas unitarias no necesitan MySQL ni ms_security.

## Autorizacion remota

Toda futura ruta queda protegida salvo Public. El guard reenvia exactamente
el mismo encabezado Bearer recibido a:

`POST ${MS_SECURITY}/api/internal/security/permissions-validation`

```json
{"url":"/negocio/sports/15","method":"DELETE"}
```

Se usa request.path, sin query y conservando `/negocio`. ms_security normaliza
los segmentos numericos a variables como `{id}`; no se elimina el prefijo.
No se recibe userId ni se decodifica JWT localmente: ms_security valida la sesion.

- Bearer ausente o mal formado: 401 sin llamada remota.
- Respuesta 200 con allowed true: continua al controller.
- Respuesta 200 con allowed false: 403.
- Respuesta remota 401: 401; respuesta remota 403: 403.
- Timeout, fallo de red, redireccion, 5xx, estado inesperado o JSON invalido: 503;
  no se ejecuta la operacion. No hay reintentos ni cache de decisiones.

El unico endpoint inicial es GET http://localhost:3001/negocio, publico,
con respuesta `{"service":"ms_negocio"}`. No hay aun endpoints deportivos ni
permisos nuevos; sus rutas se registraran y asignaran en seguridad cuando se
implementen las historias, sin modificar automaticamente su catalogo.

## Migraciones futuras (no ejecutadas en esta tarea)

```powershell
npm run migration:create -- src/migrations/Nombre
npm run migration:generate -- src/migrations/Nombre
npm run migration:show
npm run migration:run
npm run migration:revert
```

`generate`, `show`, `run` y `revert` requieren conexion a la base configurada.
Revisar las migraciones generadas antes de ejecutarlas. No hay migracion inicial
ni scripts de seed; no ejecutar migraciones hasta aprobar el modelo deportivo.
