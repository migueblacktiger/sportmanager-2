import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-04. UQ_group_teams_group_team evita repetir un equipo en un grupo y
 * UQ_group_teams_phase_team evita que un equipo este en dos grupos de la misma fase.
 * Las FK RESTRICT hacen que borrar un grupo nunca borre equipos (ni asignaciones en silencio).
 */
export class CreateGroupTeams1795737600000 implements MigrationInterface {
  name = 'CreateGroupTeams1795737600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`group_teams\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`group_id\` int NOT NULL,
        \`phase_id\` int NOT NULL,
        \`team_id\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_group_teams_group_team\` (\`group_id\`, \`team_id\`),
        UNIQUE INDEX \`UQ_group_teams_phase_team\` (\`phase_id\`, \`team_id\`),
        INDEX \`IDX_group_teams_team_id\` (\`team_id\`),
        CONSTRAINT \`FK_group_teams_group_id\`
          FOREIGN KEY (\`group_id\`) REFERENCES \`competition_groups\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_group_teams_phase_id\`
          FOREIGN KEY (\`phase_id\`) REFERENCES \`tournament_phases\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_group_teams_team_id\`
          FOREIGN KEY (\`team_id\`) REFERENCES \`teams\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `group_teams`');
  }
}
