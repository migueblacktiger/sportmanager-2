# SportManager

Proyecto con **backend** (Spring Boot, `backend/ms_security`) y **frontend** (Angular 20, `frontend`).

## 1. Backend (puerto 8181)

Requisitos: Java 25, MySQL con una base `security_ms_db` (o la que indiques en `DB_URL`).

```bash
cd backend/ms_security
export DB_PASSWORD=tu_clave_mysql        # obligatoria
# opcionales: DB_URL, DB_USERNAME, CORS_ORIGINS (por defecto http://localhost:4200)
./mvnw spring-boot:run
```

Al iniciar se crean únicamente los permisos faltantes del catálogo y los roles
`Administrador` y `Usuario`. Las asociaciones existentes no se modifican y no se
otorgan permisos automáticamente a ningún rol. Cada usuario registrado
públicamente recibe el rol `Usuario`.

### Aprovisionar el primer Administrador

En una instalación nueva, ejecuta el backend una sola vez desde una terminal
interactiva con la opción de aprovisionamiento y modo no web:

```bash
./mvnw package
java -jar target/ms_security-0.0.1-SNAPSHOT.jar --provision-admin --spring.main.web-application-type=none
```

En PowerShell:

```powershell
.\mvnw.cmd package
java -jar target\ms_security-0.0.1-SNAPSHOT.jar --provision-admin --spring.main.web-application-type=none
```

Confirma la acción e introduce el nombre, correo y contraseña dos veces en los
prompts; la contraseña no se muestra. No la pases como argumento ni la guardes
en archivos. El aprovisionamiento crea una cuenta nueva con rol
`Administrador`, no crea una sesión ni concede permisos. Falla si ya existe
cualquier cuenta asociada al rol Administrador o si el correo ya está en uso,
por lo que repetir el comando no crea otra cuenta.

Después, concede explícitamente al Administrador solo los permisos requeridos
mediante un proceso controlado. No se asigna automáticamente todo el catálogo.
La cuenta podrá iniciar sesión y usar operaciones administrativas después de
que se le concedan los permisos necesarios.

## 2. Frontend (puerto 4200)

```bash
cd frontend
npm install
npm start
```

La URL del backend está en `frontend/src/app/api.config.ts` (`http://localhost:8181/api`).

## Endpoints nuevos

| Método | URL | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro con nombre, email y contraseña (abre sesión) |
| POST | `/api/auth/login` | Inicio de sesión por credenciales |
| GET | `/api/auth/me` | Usuario, roles y permisos de la sesión (`Authorization: Bearer <token>`) |
| POST | `/api/auth/logout` | Cierra la sesión |
| GET | `/api/role-permissions` | Todas las asignaciones rol-permiso |
| GET | `/api/role-permissions/roles/{roleId}` | Permisos de un rol |
| POST | `/api/role-permissions` | Asigna un permiso a un rol |
| PUT | `/api/role-permissions/roles/{roleId}` | Reemplaza los permisos de un rol (`{"permissionIds":[…]}`) |
| DELETE | `/api/role-permissions/{roleId}/{permissionId}` | Retira un permiso de un rol |

### Administración de sesiones

Las sesiones solo se crean desde el registro o inicio de sesión. Las consultas
administrativas (`GET /api/users/{userId}/sessions` y
`GET /api/users/{userId}/sessions/{sessionId}`) devuelven el identificador,
la fecha de expiración y si la sesión sigue activa; nunca incluyen el token ni
el código 2FA. El usuario puede consultar y revocar sus propias sesiones. Para
consultar o revocar sesiones de otra cuenta se requiere el permiso efectivo de
la operación correspondiente.

`DELETE /api/users/{userId}/sessions/{sessionId}` revoca una sesión propia o,
con el permiso requerido, una sesión de otra cuenta. La creación
(`POST /api/users/{userId}/sessions`) y modificación
(`PUT /api/users/{userId}/sessions/{sessionId}`) administrativas responden
HTTP 405 y no aceptan tokens elegidos por el cliente.
