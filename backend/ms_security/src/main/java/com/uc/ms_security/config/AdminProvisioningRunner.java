package com.uc.ms_security.config;

import java.io.Console;
import java.util.Arrays;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import com.uc.ms_security.service.AdminProvisioningService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
@Order(2)
public class AdminProvisioningRunner implements ApplicationRunner {

    private static final String OPTION = "provision-admin";
    private static final String CONFIRMATION = "PROVISION ADMIN";

    private final AdminProvisioningService adminProvisioningService;
    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        if (!args.containsOption(OPTION)) {
            return;
        }
        if (!"none".equalsIgnoreCase(environment.getProperty("spring.main.web-application-type"))) {
            throw new IllegalStateException(
                    "Ejecuta el aprovisionamiento con spring.main.web-application-type=none"
            );
        }

        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException(
                    "El aprovisionamiento requiere una terminal interactiva; "
                            + "la contraseña no se acepta como argumento"
            );
        }

        String confirmation = console.readLine(
                "Esto crea la primera cuenta Administrador. Escribe %s para continuar: ",
                CONFIRMATION
        );
        if (!CONFIRMATION.equals(confirmation)) {
            throw new IllegalStateException("Aprovisionamiento cancelado");
        }

        String name = console.readLine("Nombre del administrador: ");
        String email = console.readLine("Correo del administrador: ");
        char[] password = console.readPassword("Contraseña (mínimo 8 caracteres): ");
        char[] confirmationPassword = console.readPassword("Confirma la contraseña: ");
        try {
            if (password == null || confirmationPassword == null
                    || !Arrays.equals(password, confirmationPassword)) {
                throw new IllegalArgumentException("Las contraseñas no coinciden");
            }
            adminProvisioningService.provision(name, email, password);
            console.printf("Cuenta Administrador aprovisionada. Inicia sesión para continuar.%n");
        } finally {
            if (password != null) {
                Arrays.fill(password, '\0');
            }
            if (confirmationPassword != null) {
                Arrays.fill(confirmationPassword, '\0');
            }
        }
    }
}
