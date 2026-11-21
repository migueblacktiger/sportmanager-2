import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GD-07 should add a player-skill foreign key with ON DELETE RESTRICT.
 * Until that relation exists, association-based deletion cannot be fully tested.
 */
export class CreateSkills1795290287000 implements MigrationInterface {
  name = 'CreateSkills1795290287000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`skills\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`normalized_name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
          GENERATED ALWAYS AS (LOWER(TRIM(\`name\`))) STORED,
        \`description\` text NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_skills_normalized_name\` (\`normalized_name\`),
        CONSTRAINT \`CHK_skills_name_not_blank\`
          CHECK (CHAR_LENGTH(TRIM(\`name\`)) > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `skills`');
  }
}
