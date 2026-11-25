import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchAudiences1796342400000 implements MigrationInterface {
  name = 'CreateMatchAudiences1796342400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`match_audiences\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`match_id\` int NOT NULL,
        \`fan_id\` int NOT NULL,
        \`source\` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`registered_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_match_audiences_match_source_fan\` (\`match_id\`, \`source\`, \`fan_id\`),
        INDEX \`IDX_match_audiences_match_source\` (\`match_id\`, \`source\`),
        CONSTRAINT \`CHK_match_audiences_source\`
          CHECK (\`source\` IN ('tickets', 'bets')),
        CONSTRAINT \`FK_match_audiences_match_id\`
          FOREIGN KEY (\`match_id\`) REFERENCES \`matches\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `match_audiences`');
  }
}
