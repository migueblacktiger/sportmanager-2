package com.uc.ms_security.config;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

/**
 * Firebase is intentionally opt-in. The service-account JSON is supplied only at runtime.
 */
@Configuration
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
public class FirebaseAdminConfiguration {

    @Bean
    FirebaseApp firebaseApp(
            @Value("${app.firebase.project-id}") String projectId,
            @Value("${app.firebase.service-account-json}") String serviceAccountJson)
            throws IOException {
        if (projectId.isBlank() || serviceAccountJson.isBlank()) {
            throw new IllegalStateException(
                    "Firebase requires FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON when enabled"
            );
        }
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        GoogleCredentials credentials = GoogleCredentials.fromStream(
                new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8))
        );
        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .setProjectId(projectId)
                .build();
        return FirebaseApp.initializeApp(options);
    }
}
