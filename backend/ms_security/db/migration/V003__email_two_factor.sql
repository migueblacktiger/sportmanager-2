-- Apply MANUALLY after V002. Do not change JPA_DDL_AUTO=validate.
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE two_factor_challenges (
    id VARCHAR(43) NOT NULL,
    user_id BIGINT NOT NULL,
    purpose VARCHAR(10) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    credential_hash VARCHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    last_sent_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6) NULL,
    attempts INT NOT NULL DEFAULT 0,
    resends INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_two_factor_user (user_id),
    CONSTRAINT fk_two_factor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
