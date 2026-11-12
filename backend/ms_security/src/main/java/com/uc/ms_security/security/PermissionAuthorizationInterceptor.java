package com.uc.ms_security.security;

import java.util.Set;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.pattern.PathPattern;

import com.uc.ms_security.entity.Session;
import com.uc.ms_security.service.AuthService;
import com.uc.ms_security.service.PermissionAuthorizationService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PermissionAuthorizationInterceptor implements HandlerInterceptor {

    private static final String API_PREFIX = "/api/";
    private static final Pattern USER_SESSIONS_PATH =
            Pattern.compile("^/api/users/(\\d+)/sessions(?:/(\\d+))?$");

    private final AuthService authService;
    private final PermissionAuthorizationService permissionAuthorizationService;

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) {

        String path = requestPath(request);
        String method = request.getMethod();
        if (!path.startsWith(API_PREFIX)) {
            return true;
        }

        if (CorsUtils.isPreFlightRequest(request)) {
            return true;
        }

        if (isPublicAuthenticationRequest(path, method)) {
            return true;
        }

        Session session = authService.findValidSession(bearerToken(request));
        Long authenticatedUserId = session.getUser().getId();
        request.setAttribute(RequestUserContext.USER_ID_ATTRIBUTE, authenticatedUserId);
        if (("POST".equalsIgnoreCase(method)
                && "/api/internal/security/permissions-validation".equals(path))
                || isSessionEndpoint(path, method) || isOwnTwoFactorRequest(path, method)) {
            return true;
        }
        if (isDisabledSessionMutation(path, method)) {
            throw new ResponseStatusException(
                    HttpStatus.METHOD_NOT_ALLOWED,
                    "La creación y modificación administrativa de sesiones no está permitida"
            );
        }
        if (isOwnSessionOperation(path, method, authenticatedUserId)
                || isOwnUserOperation(path, method)) {
            return true;
        }

        if (!(handler instanceof HandlerMethod)) {
            throw forbidden();
        }

        String handlerPattern = handlerPattern(request);
        if (handlerPattern == null) {
            throw forbidden();
        }

        boolean authorized = permissionAuthorizationService.hasPermissionForHandler(
                authenticatedUserId, method, handlerPattern);
        if (!authorized) {
            throw forbidden();
        }

        return true;
    }

    private static boolean isPublicAuthenticationRequest(String path, String method) {
        return "POST".equalsIgnoreCase(method)
                && ("/api/auth/register".equals(path)
                    || "/api/auth/login".equals(path)
                    || "/api/auth/oauth/firebase".equals(path)
                    || "/api/auth/password/forgot".equals(path)
                    || "/api/auth/password/reset".equals(path)
                    || "/api/auth/2fa/verify".equals(path)
                    || "/api/auth/2fa/resend".equals(path)
                    || "/api/auth/2fa/cancel".equals(path));
    }

    private static boolean isOwnTwoFactorRequest(String path, String method) {
        return ("GET".equalsIgnoreCase(method) && "/api/auth/2fa/settings".equals(path))
                || ("POST".equalsIgnoreCase(method) && Set.of(
                    "/api/auth/2fa/settings/request", "/api/auth/2fa/settings/confirm",
                    "/api/auth/2fa/settings/resend", "/api/auth/2fa/settings/cancel").contains(path));
    }

    private static boolean isSessionEndpoint(String path, String method) {
        return ("/api/auth/me".equals(path) && "GET".equalsIgnoreCase(method))
                || ("/api/auth/logout".equals(path) && "POST".equalsIgnoreCase(method));
    }

    private static boolean isOwnSessionOperation(String path, String method, Long authenticatedUserId) {
        if (!"GET".equalsIgnoreCase(method) && !"DELETE".equalsIgnoreCase(method)) {
            return false;
        }
        Matcher matcher = USER_SESSIONS_PATH.matcher(path);
        return matcher.matches()
                && Long.toString(authenticatedUserId).equals(matcher.group(1));
    }

    private static boolean isOwnUserOperation(String path, String method) {
        return ("GET".equalsIgnoreCase(method) && "/api/users/me/detail".equals(path))
                || ("PUT".equalsIgnoreCase(method) && "/api/users/me".equals(path))
                || ("PUT".equalsIgnoreCase(method) && "/api/users/me/profile".equals(path));
    }

    private static boolean isDisabledSessionMutation(String path, String method) {
        Matcher matcher = USER_SESSIONS_PATH.matcher(path);
        if (!matcher.matches()) {
            return false;
        }
        return ("POST".equalsIgnoreCase(method) && matcher.group(2) == null)
                || ("PUT".equalsIgnoreCase(method) && matcher.group(2) != null);
    }

    private static String bearerToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization == null
                || !authorization.regionMatches(true, 0, "Bearer ", 0, "Bearer ".length())) {
            throw unauthorized();
        }
        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty() || token.chars().anyMatch(Character::isWhitespace)) {
            throw unauthorized();
        }
        return token;
    }

    private static String requestPath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String contextPath = request.getContextPath();
        return requestUri.substring(contextPath.length());
    }

    private static String handlerPattern(HttpServletRequest request) {
        Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (pattern instanceof PathPattern pathPattern) {
            return pathPattern.getPatternString();
        }
        return pattern instanceof String stringPattern ? stringPattern : null;
    }

    private static ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión no válida");
    }

    private static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes el permiso requerido");
    }
}
