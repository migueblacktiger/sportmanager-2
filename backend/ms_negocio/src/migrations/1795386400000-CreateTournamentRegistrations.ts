import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTournamentRegistrations1795386400000 implements MigrationInterface {
  name = 'CreateTournamentRegistrations1795386400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`tournament_registrations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`tournament_id\` int NOT NULL,
        \`team_id\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_tournament_registrations_tournament_team\`
          (\`tournament_id\`, \`team_id\`),
        INDEX \`IDX_tournament_registrations_team_id\` (\`team_id\`),
        CONSTRAINT \`FK_tournament_registrations_tournament_id\`
          FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_tournament_registrations_team_id\`
          FOREIGN KEY (\`team_id\`) REFERENCES \`teams\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `tournament_registrations`');
  }
}
