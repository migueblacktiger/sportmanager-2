import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Requires MySQL 8.0.16+ for enforced CHECK constraints. */
export class CreatePlayers1795305600000 implements MigrationInterface {
  name = 'CreatePlayers1795305600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`players\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`identification\` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
        \`normalized_identification\` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
          GENERATED ALWAYS AS (LOWER(TRIM(\`identification\`))) STORED,
        \`description\` text NULL,
        \`active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_players_normalized_identification\` (\`normalized_identification\`),
        CONSTRAINT \`CHK_players_identification_not_blank\`
          CHECK (\`identification\` IS NULL OR CHAR_LENGTH(TRIM(\`identification\`)) > 0),
        CONSTRAINT \`CHK_players_name_not_blank\`
          CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(\`name\`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
        CONSTRAINT \`CHK_players_active_boolean\` CHECK (\`active\` IN (0, 1))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `players`');
  }
}
