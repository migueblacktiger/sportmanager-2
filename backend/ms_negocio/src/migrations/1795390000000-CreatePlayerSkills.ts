import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlayerSkills1795390000000 implements MigrationInterface {
  name = 'CreatePlayerSkills1795390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`player_skills\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`player_id\` int NOT NULL,
        \`skill_id\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_player_skills_player_skill\` (\`player_id\`, \`skill_id\`),
        INDEX \`IDX_player_skills_skill_id\` (\`skill_id\`),
        CONSTRAINT \`FK_player_skills_player_id\`
          FOREIGN KEY (\`player_id\`) REFERENCES \`players\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_player_skills_skill_id\`
          FOREIGN KEY (\`skill_id\`) REFERENCES \`skills\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `player_skills`');
  }
}
