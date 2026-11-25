# ms_notificaciones

Servicio Flask que entrega los correos solicitados por `ms_negocio` a traves de Gmail API.

## Contrato de correo

`POST /send-email`

```json
{
  "to": "aficionado@example.com",
  "subject": "Nuevo partido: Equipo A vs Equipo B",
  "text": "El partido fue programado.",
  "html": "<p>El partido fue programado.</p>"
}
```

`to` y `text` son obligatorios. `subject` conserva un valor predeterminado para clientes antiguos y
`html` es opcional; si se envia, el mensaje se compone como `multipart/alternative`. Respuesta exitosa:
`200 { "message": "Correo enviado.", "id": "..." }`. Los errores de validacion responden 400 y los
errores del proveedor de correo no se reportan como exitosos.

## Integracion local

En `ms_negocio`, configura `MAIL_SERVICE_URL=http://localhost:5000/send-email` en su entorno. Si se
define `MAIL_SERVICE_TOKEN`, el cliente NestJS envia `Authorization: Bearer <token>` y este servicio lo
valida. La variable puede omitirse para desarrollo local; para cualquier despliegue expuesto por red,
configura el mismo secreto en ambos servicios.

El envio de `ms_negocio` depende tambien de sus fuentes de audiencia: la creacion de partidos necesita
`FAN_DIRECTORY_PATH` y aficionados con participaciones previas; los resultados y anotaciones necesitan
al menos una de `MATCH_TICKETS_URL` o `MATCH_BETS_URL`. Si esas fuentes solo devuelven IDs, configura
ademas `FAN_DIRECTORY_PATH` para resolver sus correos. Estas variables se documentan en
`backend/ms_negocio/.env.example`.

Arranca ambos procesos en el mismo equipo:

```powershell
# Terminal 1
Set-Location backend\ms_notificaciones
# Define MAIL_SERVICE_TOKEN en el entorno si vas a proteger el endpoint.
python app.py

# Terminal 2; copia backend\ms_negocio\.env.example a .env y configura DB_PASSWORD.
Set-Location backend\ms_negocio
npm run start:dev
```

`ms_notificaciones` escucha en `127.0.0.1:5000`. La entrega real requiere credenciales OAuth de Gmail
con permiso de envio y el token OAuth local vigente en `credentials/`. No se deben incluir esos archivos
en el repositorio ni en logs. La primera autorizacion OAuth usa un flujo interactivo; prepara las
credenciales antes de atender solicitudes automatizadas.

Las notificaciones de partidos y resultados se intentan despues de guardar la operacion de negocio:
un fallo de correo no revierte el partido, resultado o anotacion. `ms_negocio` resume envios fallidos
en la respuesta/logs conforme a su servicio de notificaciones.

## Pruebas

```powershell
python -m unittest test_app.py
```

Las pruebas usan un cliente Gmail simulado y no envian correos.
