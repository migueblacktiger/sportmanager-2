import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-04. La tabla se llama competition_groups porque GROUPS es palabra reservada en MySQL 8.
 * El nombre es unico por fase sin distinguir mayusculas ni espacios exteriores.
 */
export class CreateCompetitionGroups1795651200000 implements MigrationInterface {
  name = 'CreateCompetitionGroups1795651200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`competition_groups\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`phase_id\` int NOT NULL,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`normalized_name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
          GENERATED ALWAYS AS (LOWER(TRIM(\`name\`))) STORED,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_competition_groups_phase_name\` (\`phase_id\`, \`normalized_name\`),
        CONSTRAINT \`CHK_competition_groups_name_not_blank\`
          CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(\`name\`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
        CONSTRAINT \`FK_competition_groups_phase_id\`
          FOREIGN KEY (\`phase_id\`) REFERENCES \`tournament_phases\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `competition_groups`');
  }
}
