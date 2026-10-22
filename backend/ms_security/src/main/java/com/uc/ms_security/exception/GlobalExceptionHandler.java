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
            case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
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
