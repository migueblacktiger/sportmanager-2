import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-06. Estado y escenario de un partido, en tabla propia 1-1 con matches (la tabla matches
 * no se modifica). Se elimina junto con su partido (CASCADE); el escenario es RESTRICT.
 * Requiere MySQL 8.0.16+ (CHECK).
 */
export class CreateMatchDetails1795996800000 implements MigrationInterface {
  name = 'CreateMatchDetails1795996800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`match_details\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`match_id\` int NOT NULL,
        \`venue_id\` int NULL,
        \`status\` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'scheduled',
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_match_details_match_id\` (\`match_id\`),
        INDEX \`IDX_match_details_venue_id\` (\`venue_id\`),
        CONSTRAINT \`CHK_match_details_status\`
          CHECK (\`status\` IN ('scheduled', 'in_progress', 'finished', 'cancelled', 'postponed')),
        CONSTRAINT \`FK_match_details_match_id\`
          FOREIGN KEY (\`match_id\`) REFERENCES \`matches\` (\`id\`)
          ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT \`FK_match_details_venue_id\`
          FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `match_details`');
  }
}
