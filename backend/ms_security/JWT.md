# HU-SE-08: internal JWT

The API uses JJWT 0.13.0 / HS256. Session lifetime remains eight hours.
JWT_SECRET is mandatory: Base64 encoding of at least 32 cryptographically random bytes.
JWT_ISSUER defaults to sportmanager; JWT_AUDIENCE defaults to sportmanager-api.
Issuer and audience must each contain 1-64 characters. Do not commit keys or log tokens.

PowerShell, in this backend directory:
```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-25.0.5.0.2'
$bytes = [byte[]]::new(32)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
# Configure DB_PASSWORD (and optionally DB_URL/DB_USERNAME) securely.
./mvnw.cmd spring-boot:run
```
Persist the production secret securely across restarts. Changing it invalidates existing JWTs.
Old UUID sessions are rejected; users must log in again. No schema migration is needed.
Session.token retains the exact JWT (maximum 500 characters); jti is a random UUID.
The verifier checks HS256 signature, issuer, audience, mandatory claims and timestamps,
then AuthService checks exact stored token, database expiry, user ID and equal expiration.
Deleting a session revokes it immediately. Permissions remain database-driven.
LocalDateTime conversion retains the existing server timezone convention: use the same
server timezone on all application instances. JWT timestamps themselves are UTC instants.

## Tests
Run with Java 25 and JWT_SECRET set (a random disposable key is suitable).
Set DB_PASSWORD to a disposable test value if required by the existing test configuration.
```powershell
./mvnw.cmd clean test
```
Integration tests use H2, not production MySQL. Test fixtures deliberately create expired
signed tokens; the production authentication flow always issues eight-hour sessions.

## Manual checks
1. POST /api/auth/login with a local account; retain response.token privately.
2. GET /api/auth/me with Authorization: Bearer <token>: expect 200.
3. Change the first character of the signature segment (after the last dot), keeping
   the rest unchanged. Repeat GET: expect 401. Do not paste tokens into external tools.
4. POST /api/auth/logout using the valid token: expect 204. Repeat GET with that same
   token: expect 401. Deleting the session through the existing authorized session
   endpoint also revokes it.
5. For a truly expired JWT, retain the original token until its exp (eight hours), then
   repeat GET: expect 401. Editing exp without signing tests tampering, not expiration.
   For fast automated expiry verification run InternalJwtServiceTest and
   PermissionAuthorizationIntegrationTest; do not weaken production lifetime for testing.
6. Confirm roles/permissions and own-session queries behave as before. 403 must not
   clear an otherwise valid session.

No Firebase, OAuth, password recovery or 2FA is implemented in this stage.
