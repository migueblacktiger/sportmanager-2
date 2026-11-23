# HU-GD-05 - Contratos de jugadores y equipos

Capas de ms_cinema adaptadas a TeamSports y al UnitOfWork transaccional de
TournamentRegistrations. Solo AppModule se modifica fuera del modulo nuevo.

## API protegida

- POST /negocio/player-teams: playerId, teamId, startDate y endDate.
- GET /negocio/player-teams/teams/:teamId: historial completo del equipo.
- GET /negocio/player-teams/players/:playerId: historial completo del jugador.
- PATCH /negocio/player-teams/:id/finish: retirada inmediata, sin cuerpo requerido.

POST devuelve 201; consultas y finalizacion devuelven 200. Las consultas aceptan
?status=programada|vigente|vencida|finalizada. Sin filtro conservan todo el historial.
Respuesta: id, playerId, teamId, startDate, endDate, finishedAt (ISO UTC o null),
status, player y team mediante los mappers existentes.

## Fechas, finalizacion e historial

DATE reales en formato YYYY-MM-DD, entre 1000-01-01 y 9999-12-31. Ambas fechas
son inclusivas; se permite un contrato de un dia. El intervalo interno es
[inicio a medianoche de Bogota, medianoche posterior al ultimo dia).
finishedAt recorta el extremo efectivo, nunca modifica el periodo contractual.
La conexion existente timezone: Z serializa DATETIME(3) en UTC. Se utiliza Intl
con America/Bogota para las fronteras, sin depender de la zona horaria del proceso.

La retirada de un contrato futuro lo finaliza con intervalo efectivo vacio;
puede crearse una nueva asignacion para esas fechas. Un contrato retirado
mantiene su historial efectivo anterior al cierre. Al usar DATE, un regreso con
inicio en el mismo dia de una retirada puede solaparse con ese tramo historico;
el dia siguiente es una nueva fecha de inicio sin solapamiento.

finishedAt tiene prioridad para el estado finalizada. Los demas estados se
calculan al consultar: programada antes del inicio, vigente durante el periodo,
vencida desde la medianoche posterior al fin. No se persisten estados que puedan
quedar desactualizados. Finalizar de nuevo conserva el primer timestamp. Finalizar
un contrato naturalmente vencido devuelve el mismo contrato vencido, sin escribir.
No hay DELETE, reactivacion ni edicion de fechas; un regreso es un contrato nuevo.

## Integridad y concurrencia

Player y Team deben existir. Sus estados activos y sus deportes, habilidades,
usuarios, inscripciones y torneos no imponen condiciones en esta historia.
Se permiten contratos simultaneos con equipos diferentes.

Creacion y finalizacion bloquean primero la fila Player con SELECT FOR UPDATE
mediante una transaccion. La creacion toma ademas un bloqueo compartido del
Team y una lectura bloqueante actual de los contratos del mismo par. El Service
rechaza los intervalos efectivos solapados con 409, incluidos los compartidos en
un dia limite. La lectura bloqueante evita snapshots obsoletos tras esperar por
otra transaccion. La finalizacion vuelve a leer el contrato bajo bloqueo.

No se crea un UNIQUE permanente del par ni del periodo: impediria regresos o
recrear un periodo cancelado antes de comenzar. El indice compuesto acelera
la consulta. Las escrituras directas a MySQL que eludan estas transacciones no
quedan protegidas por la regla temporal. Las pruebas con mocks verifican reglas,
serializacion simulada y opciones reales de bloqueo; la contencion en MySQL debe
verificarse posteriormente en un entorno de integracion autorizado.

La migracion 1795478400000-CreatePlayerTeams crea solo player_teams, dos FKs
RESTRICT, indices y CHECKs de orden/rango de fechas. Requiere MySQL 8.0.16+.
Historiales, incluso finalizados, impiden borrar Player/Team gracias a las FKs;
los servicios existentes ya traducen estas restricciones a 409.

## Pendientes de despliegue

No se ejecuto la migracion ni se registraron permisos. Mantener synchronize:
false y migrationsRun: false. Se necesitaran cuatro permisos PlayerTeam para las
rutas anteriores (parametros {teamId}, {playerId}, {id}). No se desarrollo Angular.
