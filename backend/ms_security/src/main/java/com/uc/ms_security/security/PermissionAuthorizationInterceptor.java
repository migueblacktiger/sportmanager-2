package com.uc.ms_security.security;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.pattern.PathPattern;

import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.entity.Session;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.UserRoleRepository;
import com.uc.ms_security.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PermissionAuthorizationInterceptor implements HandlerInterceptor {

    private static final String API_PREFIX = "/api/";
    private static final Pattern PATH_VARIABLE = Pattern.compile("\\{[^{}]+\\}");
    private static final Pattern USER_SESSIONS_PATH =
            Pattern.compile("^/api/users/(\\d+)/sessions(?:/(\\d+))?$");

    private final AuthService authService;
    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;

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
        if (isSessionEndpoint(path, method)) {
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

        Set<Long> roleIds = userRoleRepository.findAllByUserId(session.getUser().getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> role.getId())
                .collect(Collectors.toSet());
        if (roleIds.isEmpty()) {
            throw forbidden();
        }

        Set<Long> effectivePermissionIds = rolePermissionRepository.findAllByRoleIdIn(roleIds)
                .stream()
                .map(RolePermission::getPermission)
                .map(permission -> permission.getId())
                .collect(Collectors.toSet());

        boolean authorized = permissionRepository.findAllByMethodIgnoreCase(method)
                .stream()
                .filter(permission -> sameRoutePattern(permission.getUrl(), handlerPattern))
                .map(Permission::getId)
                .anyMatch(effectivePermissionIds::contains);
        if (!authorized) {
            throw forbidden();
        }

        return true;
    }

    private static boolean isPublicAuthenticationRequest(String path, String method) {
        return "POST".equalsIgnoreCase(method)
                && ("/api/auth/register".equals(path) || "/api/auth/login".equals(path));
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

    private static boolean sameRoutePattern(String permissionUrl, String handlerPattern) {
        return normalizePathVariables(permissionUrl).equals(normalizePathVariables(handlerPattern));
    }

    private static String normalizePathVariables(String path) {
        return PATH_VARIABLE.matcher(path).replaceAll("{}");
    }

    private static ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión no válida");
    }

    private static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes el permiso requerido");
    }
}
