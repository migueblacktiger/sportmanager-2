# Migraciones

Las migraciones TypeORM usan un nombre con timestamp y los metodos
`up(QueryRunner)` y `down(QueryRunner)`. La aplicacion conserva
`synchronize: false` y `migrationsRun: false`; crear una migracion no la ejecuta.

La migracion `1795290287000-CreateSkills` crea la tabla `skills`, con unicidad
de nombre sin distinguir mayusculas/minusculas ni espacios exteriores. No hay
todavia una tabla de asociacion con jugadores. HU-GD-07 debera agregar una FK
desde la asociacion hacia `skills.id` con `ON DELETE RESTRICT`; hasta entonces,
la proteccion por habilidades ya asignadas no se puede probar completamente.
