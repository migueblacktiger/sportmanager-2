import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Requires MySQL 8.0.16+ for enforced CHECK constraints. */
export class CreateTeams1795132800000 implements MigrationInterface {
  name = 'CreateTeams1795132800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`teams\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`description\` text NULL,
        \`active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`CHK_teams_name_not_blank\`
          CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(\`name\`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
        CONSTRAINT \`CHK_teams_active_boolean\` CHECK (\`active\` IN (0, 1))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `teams`');
  }
}
