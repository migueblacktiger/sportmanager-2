package com.uc.ms_security.service;

import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Bounded per-process limiter. Proxy headers supplied by clients are not trusted. */
@Component
public class PasswordRecoveryRateLimiter {
    private record Window(long startedAt, int attempts) { }
    private final Map<String, Window> windows = new HashMap<>();
    private static final long WINDOW_MILLIS = 15 * 60_000L;
    private static final int MAX_KEYS = 10_000;

    public synchronized boolean allow(String key, int limit) {
        long now = System.currentTimeMillis();
        Window window = windows.get(key);
        if (window == null || now - window.startedAt() >= WINDOW_MILLIS) {
            if (windows.size() >= MAX_KEYS) {
                windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt() >= WINDOW_MILLIS);
                if (!windows.containsKey(key) && windows.size() >= MAX_KEYS) return false;
            }
            windows.put(key, new Window(now, 1));
            return true;
        }
        if (window.attempts() >= limit) return false;
        windows.put(key, new Window(window.startedAt(), window.attempts() + 1));
        return true;
    }
}
