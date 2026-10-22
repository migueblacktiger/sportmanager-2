## Guía: manejo general de excepciones 

### 1. Problema de la primera versión

En la primera versión, el `Service` lanzaba directamente una excepción de Spring Web:

```java
private User findUser(Long id) {
    return userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Usuario no encontrado"
            ));
}
```

Aquí el `Service` realiza dos tareas: busca al usuario y decide cómo responder mediante HTTP. Esto incumple el principio de responsabilidad única y acopla la lógica de la aplicación con la capa de presentación.

Para corregirlo, el `Service` lanzará una excepción propia de la aplicación. Un manejador global (`@RestControllerAdvice`), ubicado en el paquete `exception`, convertirá esa excepción en la respuesta HTTP correspondiente.

### 2. Crear los paquetes nuevos

Dentro del paquete base del proyecto `com.uc.ms_security`, crea el paquete `exception`:

```text
src/main/java/com/uc/ms_security/
├── controller/
├── service/
├── repository/
├── entity/
├── dto/
├── mapper/
└── exception/
```

En `exception` estarán las clases relacionadas con los errores de la aplicación y su manejo global.

### 3. Crear el enum de casos de error

Dentro de `exception`, crea el archivo `ErrorCase.java`:

```text
src/main/java/com/uc/ms_security/exception/ErrorCase.java
```

El enum contiene las categorías de error que se vayan identificando:

```java
package com.uc.ms_security.exception;

public enum ErrorCase {
    NOT_FOUND,
    ALREADY_EXISTS,
    INVALID_OPERATION
}
```

Los nombres representan tipos de problema, no entidades específicas. Por eso, `NOT_FOUND` puede utilizarse para usuarios, perfiles u otras entidades.

### 4. Crear una excepción reutilizable

En el mismo paquete, crea `ApplicationException.java`:

```text
src/main/java/com/uc/ms_security/exception/ApplicationException.java
```

```java
package com.uc.ms_security.exception;

public class ApplicationException extends RuntimeException {

    private final ErrorCase errorCase;

    public ApplicationException(ErrorCase errorCase, String message) {
        super(message);
        this.errorCase = errorCase;
    }

    public ErrorCase getErrorCase() {
        return errorCase;
    }
}
```

Esta excepción comunica el tipo de error y su descripción. No contiene `HttpStatus` ni depende de Spring Web.

### 5. Usar la excepción desde cualquier `Service`

El `UserService`, que ya se encuentra en el paquete `service`, importa las clases del paquete `exception`:

```java
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
```

Luego, puede lanzar la excepción cuando el usuario no exista:

```java
private User findUser(Long id) {
    return userRepository.findById(id)
            .orElseThrow(() -> new ApplicationException(
                    ErrorCase.NOT_FOUND,
                    "Usuario no encontrado con id: " + id
            ));
}
```

Otro service puede utilizar la misma excepción para otra entidad:

```java
private Profile findProfile(Long id) {
    return profileRepository.findById(id)
            .orElseThrow(() -> new ApplicationException(
                    ErrorCase.NOT_FOUND,
                    "Perfil no encontrado con id: " + id
            ));
}
```

También se puede usar para un email duplicado:

```java
if (userRepository.existsByEmail(dto.getEmail())) {
    throw new ApplicationException(
            ErrorCase.ALREADY_EXISTS,
            "Ya existe un usuario con este email"
    );
}
```

Así, todos los services reutilizan la misma excepción y comunican el problema sin decidir cómo debe responder la API.

> Los ejemplos de `Profile`, `Role` y `UserRole` usan entidades que se crean en las guías 2 a 4; puedes volver a ellos cuando las hayas implementado.

El `RoleService` utiliza los mismos casos para sus operaciones:

```java
private Role findEntityById(Long id) {
    return roleRepository.findById(id)
        .orElseThrow(() -> new ApplicationException(
            ErrorCase.NOT_FOUND,
            "Rol no encontrado"
        ));
}
```

Para evitar nombres de rol duplicados:

```java
if (roleRepository.existsByNameIgnoreCase(dto.getName())) {
    throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        "Ya existe un rol con ese nombre"
    );
}
```

Si se intenta eliminar un rol asignado a un usuario, se utiliza `INVALID_OPERATION` (se traduce a `409 Conflict`: la petición es válida, pero el estado actual del recurso impide la operación):

```java
if (userRoleRepository.existsByRoleId(id)) {
    throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        "No se puede eliminar un rol que está asignado"
    );
}
```

### 6. Crear el manejador global de excepciones

En el paquete `exception`, crea `GlobalExceptionHandler.java`:

```text
src/main/java/com/uc/ms_security/exception/GlobalExceptionHandler.java
```

```java
package com.uc.ms_security.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<Map<String, String>> handleApplicationException(
            ApplicationException exception) {

        HttpStatus status = switch (exception.getErrorCase()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ALREADY_EXISTS -> HttpStatus.CONFLICT;
            case INVALID_OPERATION -> HttpStatus.CONFLICT;
        };

        return error(status, exception.getErrorCase().name(), exception.getMessage());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(
            ResponseStatusException exception,
            HttpServletRequest request) {

        if (exception.getStatusCode().is5xxServerError()) {
            String errorId = UUID.randomUUID().toString();
            logger.error(
                    "Error HTTP {} [{}] en {} {}",
                    exception.getStatusCode().value(),
                    errorId,
                    request.getMethod(),
                    request.getRequestURI(),
                    exception
            );
        }

        String message = exception.getReason() != null
                ? exception.getReason()
                : "Error HTTP " + exception.getStatusCode().value();

        Map<String, String> error = new LinkedHashMap<>();
        error.put("errorCase", "HTTP_ERROR");
        error.put("message", message);

        return ResponseEntity.status(exception.getStatusCode()).body(error);
    }

    /**
     * Errores de validación (@Valid). Mantiene la estructura {errorCase, message}
     * de los demás errores y agrega el detalle por campo en "errors".
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException exception) {

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            // Si un campo incumple varias reglas, se conservan todos los mensajes.
            fieldErrors.merge(
                    fieldError.getField(),
                    String.valueOf(fieldError.getDefaultMessage()),
                    (previous, current) -> previous + "; " + current
            );
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("errorCase", "VALIDATION_ERROR");
        body.put("message", "Los datos enviados no son válidos");
        body.put("errors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Violaciones de restricciones de la base de datos (por ejemplo, un email o un
     * token duplicado detectado por la restricción UNIQUE, o borrar un registro en uso).
     * Cubre las condiciones de carrera que el "existsBy..." previo no puede evitar.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(
            DataIntegrityViolationException exception,
            HttpServletRequest request) {

        logger.warn(
                "Violación de integridad de datos en {} {}: {}",
                request.getMethod(),
                request.getRequestURI(),
                exception.getMostSpecificCause().getMessage()
        );

        return error(
                HttpStatus.CONFLICT,
                "DATA_INTEGRITY",
                "La operación viola una restricción de datos (valor duplicado o registro en uso)"
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadableBody(
            HttpMessageNotReadableException exception) {

        return error(
                HttpStatus.BAD_REQUEST,
                "MALFORMED_REQUEST",
                "El cuerpo de la solicitud no es un JSON válido o tiene valores con formato incorrecto"
        );
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception) {

        return error(
                HttpStatus.BAD_REQUEST,
                "INVALID_PARAMETER",
                "El parámetro '" + exception.getName() + "' tiene un valor inválido"
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException exception) {

        return error(
                HttpStatus.METHOD_NOT_ALLOWED,
                "METHOD_NOT_ALLOWED",
                "El método HTTP no está permitido para este recurso"
        );
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException exception) {

        return error(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_MEDIA_TYPE",
                "El tipo de contenido no es compatible; usa application/json"
        );
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoResource(
            NoResourceFoundException exception) {

        return error(
                HttpStatus.NOT_FOUND,
                "NOT_FOUND",
                "Recurso no encontrado"
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request) {

        String errorId = UUID.randomUUID().toString();
        logger.error(
                "Error inesperado [{}] en {} {}. Tipo: {}",
                errorId,
                request.getMethod(),
                request.getRequestURI(),
                exception.getClass().getName(),
                exception
        );

        Map<String, String> error = new LinkedHashMap<>();
        error.put("errorCase", "INTERNAL_ERROR");
        error.put("message", "Error interno del servidor. Consulta los logs con el identificador proporcionado.");
        error.put("errorId", errorId);
        error.put("path", request.getRequestURI());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private ResponseEntity<Map<String, String>> error(
            HttpStatus status,
            String errorCase,
            String message) {

        Map<String, String> body = new LinkedHashMap<>();
        body.put("errorCase", errorCase);
        body.put("message", message);

        return ResponseEntity.status(status).body(body);
    }
}
```

La anotación `@RestControllerAdvice` permite que Spring detecte el manejador y aplique sus métodos a las excepciones que ocurran durante las solicitudes de la API. No es necesario agregar un `try-catch` en cada método del controlador.

Las excepciones de aplicación se devuelven como JSON. Por ejemplo, un usuario no encontrado produce:

```json
{
    "errorCase": "NOT_FOUND",
    "message": "Usuario no encontrado con id: 9"
}
```

Las excepciones inesperadas producen una respuesta `500`. El detalle se escribe en el log y el cliente recibe un identificador para localizarlo:

```json
{
    "errorCase": "INTERNAL_ERROR",
    "message": "Error interno del servidor. Consulta los logs con el identificador proporcionado.",
    "errorId": "b2f1c0de-...",
    "path": "/api/users/9"
}
```

Un `catch` genérico que no registra nada hace imposible depurar: por eso `handleUnexpectedException` escribe el error con `logger.error`.

#### Errores del framework

Si solo existiera el manejador de `Exception`, también capturaría los errores propios de Spring MVC y los convertiría en un `500` engañoso (un JSON mal formado, `/api/users/abc` o un método HTTP no permitido no son errores del servidor). Por eso se agregan manejadores específicos:

| Excepción | Respuesta |
| --- | --- |
| `HttpMessageNotReadableException` (JSON inválido, fecha con formato incorrecto) | `400` `MALFORMED_REQUEST` |
| `MethodArgumentTypeMismatchException` (`/api/users/abc`) | `400` `INVALID_PARAMETER` |
| `HttpRequestMethodNotSupportedException` | `405` `METHOD_NOT_ALLOWED` |
| `HttpMediaTypeNotSupportedException` | `415` `UNSUPPORTED_MEDIA_TYPE` |
| `NoResourceFoundException` (ruta inexistente) | `404` `NOT_FOUND` |
| `DataIntegrityViolationException` (restricción UNIQUE o clave foránea) | `409` `DATA_INTEGRITY` |

`DataIntegrityViolationException` cubre las condiciones de carrera: `existsByEmail(...)` seguido de `save(...)` no es atómico, y si dos peticiones simultáneas pasan la comprobación, la restricción `UNIQUE` de MySQL rechaza la segunda.

#### Formato único de error

Todas las respuestas de error comparten `errorCase` y `message`. Los errores de validación agregan además el detalle por campo:

```json
{
    "errorCase": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "errors": {
        "email": "El email no tiene un formato válido",
        "password": "La contraseña debe tener mínimo 8 caracteres"
    }
}
```

### 7. Estructura final del proyecto

```text
src/main/java/com/uc/ms_security/
├── controller/
│   └── UserController.java
├── service/
│   └── UserService.java
├── repository/
│   └── UserRepository.java
├── entity/
│   └── User.java
├── dto/
├── mapper/
└── exception/
    ├── ApplicationException.java
    ├── ErrorCase.java
    └── GlobalExceptionHandler.java
```

### 8. Agregar casos nuevos

Cuando se identifique una nueva categoría de error:

1. Si no encaja en las existentes, se agrega un valor a `ErrorCase`.
2. El service lanza `ApplicationException` con ese caso y un mensaje descriptivo.
3. Se añade la correspondencia entre el nuevo caso y el estado HTTP en el `switch` de `GlobalExceptionHandler`.

Por ejemplo, para un error de autenticación, se puede agregar `UNAUTHORIZED`:

```java
public enum ErrorCase {
    NOT_FOUND,
    ALREADY_EXISTS,
    INVALID_OPERATION,
    UNAUTHORIZED
}
```

Y en el `switch`:

```java
case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
```

Si el error nuevo ya corresponde a una categoría existente, se reutiliza esa categoría y se adapta el mensaje. De esta manera, la misma configuración puede atender excepciones de distintas entidades y situaciones.
