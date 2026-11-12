package com.uc.ms_security.service;

import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.UserRoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PermissionAuthorizationService {
    private static final Pattern PATH_VARIABLE = Pattern.compile("\\{[^{}]+\\}");
    private static final Pattern NUMERIC_SEGMENT = Pattern.compile("(?<=/)[0-9]+(?=/|$)");

    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public boolean hasPermissionForHandler(Long userId, String method, String handlerPattern) {
        return hasPermission(userId, method,
                url -> normalizeVariables(url).equals(normalizeVariables(handlerPattern)));
    }

    /** Remote numeric IDs are normalized; literal segments and service prefixes stay exact. */
    public boolean hasPermission(Long userId, String method, String requestUrl) {
        String normalized = NUMERIC_SEGMENT.matcher(normalizeVariables(requestUrl)).replaceAll("{}");
        return hasPermission(userId, method,
                url -> url.equals(requestUrl) || normalizeVariables(url).equals(normalized));
    }

    private boolean hasPermission(Long userId, String method, Predicate<String> routeMatches) {
        Set<Long> roleIds = userRoleRepository.findAllByUserId(userId).stream()
                .map(assignment -> assignment.getRole().getId())
                .collect(Collectors.toSet());
        if (roleIds.isEmpty()) {
            return false;
        }
        Set<Long> permissionIds = rolePermissionRepository.findAllByRoleIdIn(roleIds).stream()
                .map(assignment -> assignment.getPermission().getId())
                .collect(Collectors.toSet());
        return permissionRepository.findAllByMethodIgnoreCase(method).stream()
                .filter(permission -> routeMatches.test(permission.getUrl()))
                .map(Permission::getId)
                .anyMatch(permissionIds::contains);
    }

    private static String normalizeVariables(String path) {
        return PATH_VARIABLE.matcher(path).replaceAll("{}");
    }
}
