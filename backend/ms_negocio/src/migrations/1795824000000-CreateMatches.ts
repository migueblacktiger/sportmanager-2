import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-05. Los partidos pertenecen a una fase (FK RESTRICT): una fase con partidos no se puede
 * eliminar y los partidos de una fase final quedan identificados por su phase_id.
 * scheduled_at se guarda como DATETIME(3) en UTC, igual que las fechas de tournaments.
 */
export class CreateMatches1795824000000 implements MigrationInterface {
  name = 'CreateMatches1795824000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`matches\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`phase_id\` int NOT NULL,
        \`home_team_id\` int NOT NULL,
        \`away_team_id\` int NOT NULL,
        \`scheduled_at\` datetime(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_matches_phase_id\` (\`phase_id\`),
        INDEX \`IDX_matches_home_team_id\` (\`home_team_id\`),
        INDEX \`IDX_matches_away_team_id\` (\`away_team_id\`),
        CONSTRAINT \`CHK_matches_teams_different\`
          CHECK (\`home_team_id\` <> \`away_team_id\`),
        CONSTRAINT \`FK_matches_phase_id\`
          FOREIGN KEY (\`phase_id\`) REFERENCES \`tournament_phases\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_matches_home_team_id\`
          FOREIGN KEY (\`home_team_id\`) REFERENCES \`teams\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_matches_away_team_id\`
          FOREIGN KEY (\`away_team_id\`) REFERENCES \`teams\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `matches`');
  }
}
