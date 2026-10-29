package com.uc.ms_security.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "external_identities", uniqueConstraints = @UniqueConstraint(
        name = "uk_external_identity",
        columnNames = {"firebase_project_id", "provider", "firebase_uid"}
))
@Getter
@Setter
@NoArgsConstructor
public class ExternalIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "firebase_project_id", nullable = false, length = 100)
    private String firebaseProjectId;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "firebase_uid", nullable = false, length = 128)
    private String firebaseUid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
