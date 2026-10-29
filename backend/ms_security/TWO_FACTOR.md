# HU-SE-10 — 2FA por correo para cuentas LOCAL

## Preparación manual

Aplicar `db/migration/V003__email_two_factor.sql` después de las migraciones anteriores, antes de arrancar esta versión. No hay ejecución automática. Mantener `JPA_DDL_AUTO=validate`. La columna nueva queda en `false` para cuentas existentes; los códigos se almacenan únicamente como HMAC, nunca en `sessions.code_2fa`.

Definir `TWO_FACTOR_HMAC_KEY` con una clave Base64 de al menos 32 bytes generados criptográficamente. Generarla fuera del repositorio, guardarla en el gestor de secretos/entorno y usar el mismo valor en todas las instancias. No reutilizar ni cambiar `JWT_SECRET`. Sin esta clave, el acceso sin 2FA sigue funcionando, pero no se permite activar 2FA ni completar un login que ya lo exija. Rotarla invalida desafíos pendientes, no cambia la configuración del usuario.

Se reutilizan SMTP y `SMTP_FROM` de HU-SE-09, con `PASSWORD_RESET_MAIL_ENABLED=true`. No se agregan credenciales ni dependencias. Si SMTP falla, no se entrega un desafío nuevo ni se crea una sesión. No habilitar logs de cuerpos HTTP/SMTP: contienen contraseñas y códigos.

## Endpoints

| Método | Ruta bajo `/api/auth/2fa` | Acceso / cuerpo |
| --- | --- | --- |
| POST | `/verify` | Público: `challengeId`, `code`; solo desafíos LOGIN |
| POST | `/resend` | Público: `challengeId`; solo LOGIN |
| POST | `/cancel` | Público: `challengeId`; solo LOGIN |
| GET | `/settings` | Sesión válida; configuración de la cuenta propia |
| POST | `/settings/request` | Sesión válida, `password` actual y `enabled` deseado |
| POST | `/settings/confirm` | Sesión válida, `challengeId`, `code`; solo ENABLE/DISABLE del mismo usuario |
| POST | `/settings/resend` | Sesión válida, `challengeId`; solo configuración propia |
| POST | `/settings/cancel` | Sesión válida, `challengeId`; solo configuración propia |

`POST /api/auth/login` conserva su respuesta habitual para cuentas sin 2FA. Con 2FA devuelve `twoFactorRequired`, identificador aleatorio, propósito, correo enmascarado y tiempos; no devuelve JWT, usuario autenticado ni sesión. Solo `/verify` crea la sesión y devuelve el JWT interno después del código correcto.

## Activar, desactivar y probar

1. Entrar con una cuenta LOCAL y abrir **Seguridad de cuenta** en el menú.
2. Introducir la contraseña actual y solicitar activación. Confirmar con el código recibido por correo.
3. La activación cierra todas las sesiones actuales. Volver al login: correo y contraseña deben llevar a la pantalla del código, sin guardar un JWT nuevo todavía.
4. Introducir el código de seis dígitos. Verificar dashboard, Ctrl + F5, permisos y logout.
5. Probar código incorrecto, quinto intento, expiración (cinco minutos), reutilización, cancelación y reenvío. El reenvío exige 60 segundos, invalida el código previo y no reinicia intentos ni amplía la expiración. Máximo tres reenvíos.
6. Para desactivar, repetir desde Seguridad de cuenta con contraseña actual y código del correo. Se cierran las sesiones; el siguiente login debe ser tradicional.
7. Probar recuperar la contraseña con HU-SE-09 cuando 2FA está activo: la recuperación conserva el indicador y el siguiente login sigue pidiendo código. Los desafíos anteriores al cambio de contraseña dejan de ser válidos.
8. Google/GitHub/Microsoft mantienen Firebase; la configuración informa que el 2FA interno no está disponible para EXTERNAL.

Cambiar correo/contraseña propios ahora requiere la contraseña actual. Con 2FA activo no se permite cambiar el correo desde la edición genérica (tampoco administrativa) antes de desactivar 2FA con contraseña y código. Así un JWT robado no permite redirigir el correo y eludir la confirmación. Para editar las credenciales propias desde administración, utilizar Perfil con contraseña actual.

## Garantías y límites

Los desafíos usan un ID aleatorio de 256 bits y un código de seis dígitos de `SecureRandom`, HMAC-SHA256 con clave independiente y comparación de tiempo constante. El HMAC liga código, ID, usuario y propósito; una huella HMAC adicional los invalida al cambiar correo, contraseña o configuración 2FA. Solo cuentas LOCAL habilitadas pueden utilizarlos.

Verificación y creación de sesión/cambio de configuración ocurren en una misma transacción con bloqueos de usuario y desafío. Los intentos fallidos se confirman en BD, sin revertir el contador al devolver error. El quinto fallo consume el desafío. El desafío cancelado/expirado nunca crea una sesión.

Límites adicionales por proceso y ventana de 15 minutos: emisión 10/IP y 5/usuario; reautenticación de configuración 10/IP y 5/usuario; verificación 30/IP y 15/usuario; reenvío 10/IP y 5/usuario. Se reutiliza el limitador acotado de HU-SE-09 con claves separadas `2fa:`; no se confía en `X-Forwarded-For`. Complementar con límites compartidos en el gateway si hay múltiples instancias/proxy. Los límites persistidos por desafío siempre se aplican en MySQL.

Angular conserva el desafío únicamente en memoria. Recargar antes de terminar requiere repetir el login o la solicitud de configuración; no abre popups ni inicia sesión automáticamente. Los códigos de recuperación de contraseña son independientes. El 2FA por correo depende de la seguridad del buzón y de la entrega/cuotas de SMTP; sin acceso al buzón no hay bypass administrativo añadido.

Pendientes: aplicar migración y configurar la clave del servidor; validar manualmente entrega SMTP, activación/desactivación, acceso con código, concurrencia/reutilización, HU-SE-09 y no regresión de OAuth. Solo se autorizó compilación, no pruebas automáticas ni modificaciones de MySQL.

## Archivos de HU-SE-10

Nuevos en `src/main/java/com/uc/ms_security`: `controller/TwoFactorController.java`, `dto/auth/LoginResultDTO.java`, `dto/auth/TwoFactorDTO.java`, `entity/TwoFactorChallenge.java`, `repository/TwoFactorChallengeRepository.java` y `service/TwoFactorService.java`; además de esta guía y la migración V003.

Modificados: `entity/User.java`, `dto/auth/AuthResponseDTO.java`, `dto/user/UpdateUserDTO.java`, `controller/AuthController.java`, `controller/UserController.java`, `service/AuthService.java`, `service/UserService.java`, `service/PasswordRecoveryMailer.java`, `security/PermissionAuthorizationInterceptor.java`, `src/main/resources/application.properties`; en frontend, `src/app/api.service.ts`, `src/app/app.component.ts`, `src/app/app.component.html`, `src/app/http-error-policy.ts` y `src/styles.css`.
