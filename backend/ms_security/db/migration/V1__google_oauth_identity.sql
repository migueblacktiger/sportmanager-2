-- Review and run this migration manually against MySQL before enabling Google OAuth.
-- It is non-destructive and does not delete or alter existing user identities.
ALTER TABLE users
    ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- OAuth users do not have a local SportManager password.
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;

CREATE TABLE external_identities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    firebase_project_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    firebase_uid VARCHAR(128) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_external_identity UNIQUE (firebase_project_id, provider, firebase_uid),
    CONSTRAINT fk_external_identity_user FOREIGN KEY (user_id) REFERENCES users(id)
);
