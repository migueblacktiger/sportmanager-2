import type { MigrationInterface, QueryRunner } from 'typeorm';

/** HU-GC-06. Escenarios donde se disputan los partidos. Requiere MySQL 8.0.16+ (CHECK). */
export class CreateVenues1795910400000 implements MigrationInterface {
  name = 'CreateVenues1795910400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`venues\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`normalized_name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
          GENERATED ALWAYS AS (LOWER(TRIM(\`name\`))) STORED,
        \`address\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
        \`description\` text NULL,
        \`active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_venues_normalized_name\` (\`normalized_name\`),
        CONSTRAINT \`CHK_venues_name_not_blank\`
          CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(\`name\`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
        CONSTRAINT \`CHK_venues_active_boolean\` CHECK (\`active\` IN (0, 1))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `venues`');
  }
}
