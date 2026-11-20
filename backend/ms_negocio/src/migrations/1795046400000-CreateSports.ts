import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Requires MySQL 8.0.16+ for enforced CHECK constraints. */
export class CreateSports1795046400000 implements MigrationInterface {
  name = 'CreateSports1795046400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`sports\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`normalized_name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
          GENERATED ALWAYS AS (LOWER(REPLACE(TRIM(\`name\`), ' ', ''))) STORED,
        \`description\` text NULL,
        \`active\` tinyint NOT NULL DEFAULT 1,
        \`parent_id\` int NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_sports_normalized_name\` (\`normalized_name\`),
        INDEX \`IDX_sports_parent_id\` (\`parent_id\`),
        CONSTRAINT \`CHK_sports_name_not_blank\`
          CHECK (CHAR_LENGTH(REPLACE(\`name\`, ' ', '')) > 0),
        CONSTRAINT \`FK_sports_parent_id\`
          FOREIGN KEY (\`parent_id\`) REFERENCES \`sports\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `sports` DROP FOREIGN KEY `FK_sports_parent_id`',
    );
    await queryRunner.query('DROP TABLE `sports`');
  }
}
