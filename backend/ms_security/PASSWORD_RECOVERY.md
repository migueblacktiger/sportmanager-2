# HU-SE-09 — Recuperación de contraseña LOCAL

## Archivos

Nuevos (dentro de `src/main/java/com/uc/ms_security/`): `config/PasswordRecoveryConfiguration.java`, `controller/PasswordRecoveryController.java`, `dto/auth/ForgotPasswordRequestDTO.java`, `dto/auth/ResetPasswordRequestDTO.java`, `entity/PasswordResetRequest.java`, `repository/PasswordResetRequestRepository.java`, `service/PasswordRecoveryService.java`, `service/PasswordRecoveryMailer.java` y `service/PasswordRecoveryRateLimiter.java`. También esta guía y `db/migration/V002__password_reset_requests.sql`.

Modificados en backend: `pom.xml`, `src/main/resources/application.properties`, `repository/UserRepository.java`, `repository/SessionRepository.java` y `security/PermissionAuthorizationInterceptor.java` (estos tres últimos dentro del paquete Java indicado). En frontend: `src/app/api.service.ts`, `src/app/app.component.ts`, `src/app/app.component.html` y `src/app/http-error-policy.ts`. No se modificaron los servicios OAuth, el registro ni el login tradicionales.

## Preparación

1. Aplicar manualmente `db/migration/V002__password_reset_requests.sql` sobre la base configurada, antes de arrancar esta versión. No hay ejecutor automático. Mantener `JPA_DDL_AUTO=validate`.
2. Configurar SMTP mediante variables de entorno y reiniciar el backend:

| Variable | Uso / valor predeterminado |
| --- | --- |
| `PASSWORD_RESET_MAIL_ENABLED` | `true` para enviar; por defecto `false` |
| `PASSWORD_RESET_FRONTEND_URL` | URL base pública de Angular, por defecto `http://localhost:4200/`; HTTPS en producción, sin query ni fragmento |
| `SMTP_HOST` | Host del servidor SMTP |
| `SMTP_PORT` | `587` por defecto |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | Credenciales reales; usar contraseña de aplicación si el proveedor lo requiere |
| `SMTP_FROM` | Remitente autorizado por el servidor SMTP |
| `SMTP_AUTH` | `true` por defecto |
| `SMTP_STARTTLS` | `true` por defecto; TLS obligatorio cuando está activo |
| `SMTP_SSL` | `false` por defecto; para TLS implícito, normalmente puerto 465 y STARTTLS desactivado |

No guardar credenciales en Git. SMTP tiene tiempos máximos de conexión/lectura/escritura de 5 segundos. No habilitar logs SMTP/HTTP de cuerpos ni logs de tokens. Sin SMTP configurado, la respuesta pública sigue siendo genérica y no se entrega ningún enlace.

## Flujo manual

Desde «¿Olvidaste tu contraseña?», solicitar correo de una cuenta LOCAL habilitada. Abrir el último enlace recibido en un navegador con Angular, escribir y confirmar una contraseña de al menos 8 caracteres. Volver al login e ingresar con la nueva contraseña. La anterior debe fallar; las sesiones anteriores deben dejar de acceder a recursos protegidos. No se inicia sesión automáticamente. No se modifican atributos de segundo factor ni se implementa HU-SE-10.

El enlace usa un fragmento `#reset-password=...` para evitar enviar el token al servidor web o por Referer. Angular lo elimina de la barra al abrirlo; si se recarga o se abandona la pantalla, hay que volver a abrir el enlace del correo. Tiene validez de 15 minutos y un solo uso. Un envío nuevo correcto invalida los enlaces anteriores; un cambio correcto invalida todas las solicitudes pendientes del usuario. Solo se persiste SHA-256 del secreto aleatorio de 256 bits, con fechas UTC.

Los endpoints públicos son `POST /api/auth/password/forgot` (`email`) y `POST /api/auth/password/reset` (`token`, `password`). Cuentas EXTERNAL, inexistentes, deshabilitadas y solicitudes limitadas reciben la misma confirmación pública. El trabajo SMTP se procesa en una cola acotada; sus errores no revelan la existencia de cuentas.

Límites por proceso de backend: 5 solicitudes por IP y 3 por correo en 15 minutos; 10 intentos de cambio por IP en 15 minutos. El proceso no confía en `X-Forwarded-For`. En despliegues con varias instancias o proxy, complementar con límites compartidos en el gateway y configurar las IP confiables en la infraestructura. Reiniciar el proceso reinicia estos contadores. La exclusión concurrente y el uso único del enlace se garantizan en MySQL mediante transacciones y bloqueos de usuario/solicitud.

Pendiente de validación manual: entrega SMTP real, configuración del remitente, reapertura/expiración/reutilización de enlaces, revocación de sesiones y no regresión de los accesos existentes. La compilación no verifica esos comportamientos.
