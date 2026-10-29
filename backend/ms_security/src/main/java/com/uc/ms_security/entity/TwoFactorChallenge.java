package com.uc.ms_security.entity;

import java.time.Instant;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "two_factor_challenges")
@Getter @Setter @NoArgsConstructor
public class TwoFactorChallenge {
    public enum Purpose { LOGIN, ENABLE, DISABLE }
    @Id @Column(length = 43)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10)
    private Purpose purpose;
    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;
    @Column(name = "credential_hash", nullable = false, length = 64)
    private String credentialHash;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;
    @Column(nullable = false)
    private int attempts;
    @Column(nullable = false)
    private int resends;
    @Column(name = "consumed_at")
    private Instant consumedAt;
}
