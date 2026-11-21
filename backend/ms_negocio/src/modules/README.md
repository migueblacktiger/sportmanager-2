# Modulos de negocio

Los modulos `sports` y `skills` siguen el patron de ms_cinema por funcionalidad:

```text
<funcionalidad>/
  dto/          # create, update y response; class-validator en entradas
  entities/     # entidades TypeORM
  mappers/      # toEntity, mergeEntity, toResponseDto, toResponseDtoList
  repositories/ # consultas especificas con DataSource / InjectDataSource
  <funcionalidad>.service.ts
  <funcionalidad>.controller.ts
  <funcionalidad>.module.ts
```

El module registra TypeOrmModule.forFeature, controller, service, repository y
mapper. El controller delega en service; el service no consulta TypeORM; el
repository encapsula persistencia y el mapper separa entidades y DTO. No declarar
Public en operaciones de negocio. Registrar cada modulo en AppModule y crear su
migracion explicita. No agregar entidades ni CRUD como marcadores vacios.
