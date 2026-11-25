import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-07. Resultado de un partido (1-1). La FK a matches es RESTRICT: un partido con resultado
 * no se puede eliminar. updated_at lo informa la aplicacion (UTC), como las demas fechas.
 */
export class CreateMatchResults1796169600000 implements MigrationInterface {
  name = 'CreateMatchResults1796169600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`match_results\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`match_id\` int NOT NULL,
        \`home_score\` int NOT NULL,
        \`away_score\` int NOT NULL,
        \`updated_at\` datetime(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_match_results_match_id\` (\`match_id\`),
        CONSTRAINT \`CHK_match_results_scores\`
          CHECK (\`home_score\` >= 0 AND \`away_score\` >= 0),
        CONSTRAINT \`FK_match_results_match_id\`
          FOREIGN KEY (\`match_id\`) REFERENCES \`matches\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `match_results`');
  }
}
