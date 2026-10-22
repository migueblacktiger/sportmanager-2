package com.uc.ms_security.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"url", "method"})
)
@Getter
@Setter
@NoArgsConstructor
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String url;

    @Column(nullable = false, length = 10)
    private String method; // GET, POST, PUT, PATCH, DELETE

    @Column(nullable = false, length = 50)
    private String model;  // User, Role, Permission...
}