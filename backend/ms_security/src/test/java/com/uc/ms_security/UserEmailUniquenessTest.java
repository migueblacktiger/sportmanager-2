package com.uc.ms_security;

import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;

import com.uc.ms_security.entity.User;
import com.uc.ms_security.repository.UserRepository;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:ms_security_test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class UserEmailUniquenessTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void databaseShouldRejectDuplicateEmail() {
        String email = UUID.randomUUID() + "@example.com";
        userRepository.saveAndFlush(user(email));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> userRepository.saveAndFlush(user(email))
        );
    }

    private User user(String email) {
        User user = new User();
        user.setName("Test user");
        user.setEmail(email);
        user.setPassword("encoded-password");
        return user;
    }
}
