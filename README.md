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

Al iniciar se crean (solo si faltan) el catálogo de permisos de la API y los roles
`Administrador` y `Usuario`. Al `Administrador` se le asignan todos los permisos.

**El primer usuario que se registre queda como Administrador**; los siguientes reciben el rol `Usuario`.
Un administrador puede después asignar roles y permisos desde la sección *Seguridad*.

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
