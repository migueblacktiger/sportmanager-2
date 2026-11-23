import type { MigrationInterface, QueryRunner } from 'typeorm';

/** MySQL 8.0.16+; overlap serialization is enforced by the PlayerTeams transaction. */
export class CreatePlayerTeams1795478400000 implements MigrationInterface {
  name = 'CreatePlayerTeams1795478400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`player_teams\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`player_id\` int NOT NULL,
        \`team_id\` int NOT NULL,
        \`start_date\` date NOT NULL,
        \`end_date\` date NOT NULL,
        \`finished_at\` datetime(3) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_player_teams_player_team_period\` (\`player_id\`, \`team_id\`, \`start_date\`, \`end_date\`),
        INDEX \`IDX_player_teams_team_id\` (\`team_id\`),
        CONSTRAINT \`CHK_player_teams_dates\` CHECK (\`start_date\` <= \`end_date\`),
        CONSTRAINT \`CHK_player_teams_date_range\` CHECK (\`start_date\` >= '1000-01-01' AND \`end_date\` <= '9999-12-31'),
        CONSTRAINT \`FK_player_teams_player_id\` FOREIGN KEY (\`player_id\`) REFERENCES \`players\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_player_teams_team_id\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `player_teams`');
  }
}
