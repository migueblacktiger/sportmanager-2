import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-03. Una fase pertenece a un unico torneo (FK RESTRICT): eliminar o modificar una fase
 * nunca elimina el torneo, y un torneo con fases no se puede eliminar.
 */
export class CreateTournamentPhases1795564800000 implements MigrationInterface {
  name = 'CreateTournamentPhases1795564800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`tournament_phases\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`tournament_id\` int NOT NULL,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`phase_type\` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`phase_order\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_tournament_phases_tournament_order\` (\`tournament_id\`, \`phase_order\`),
        CONSTRAINT \`CHK_tournament_phases_name_not_blank\`
          CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(\`name\`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
        CONSTRAINT \`CHK_tournament_phases_order_positive\`
          CHECK (\`phase_order\` >= 1),
        CONSTRAINT \`CHK_tournament_phases_type\`
          CHECK (\`phase_type\` IN ('groups', 'league', 'knockout', 'final')),
        CONSTRAINT \`FK_tournament_phases_tournament_id\`
          FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `tournament_phases`');
  }
}
