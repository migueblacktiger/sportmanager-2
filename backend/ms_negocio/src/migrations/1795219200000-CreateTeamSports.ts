import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamSports1795219200000 implements MigrationInterface {
  name = 'CreateTeamSports1795219200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`team_sports\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`team_id\` int NOT NULL,
        \`sport_id\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_team_sports_team_sport\` (\`team_id\`, \`sport_id\`),
        INDEX \`IDX_team_sports_sport_id\` (\`sport_id\`),
        CONSTRAINT \`FK_team_sports_team_id\`
          FOREIGN KEY (\`team_id\`) REFERENCES \`teams\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_team_sports_sport_id\`
          FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `team_sports`');
  }
}
