# Modulos de negocio pendientes

Todavia no se registran modulos deportivos. Cuando se disenen las historias,
seguir el patron de ms_cinema por funcionalidad:

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
mapper cuando corresponda, como en el ejemplo. El controller delega en service;
el mapper separa entidades y DTO. No declarar Public en operaciones deportivas.
Registrar el modulo en AppModule y crear su migracion explicita solo cuando
se apruebe el modelo. No agregar entidades ni CRUD como marcadores vacios.
