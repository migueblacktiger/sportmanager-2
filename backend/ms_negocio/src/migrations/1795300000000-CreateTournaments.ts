import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registration window and tournament start times are stored as UTC DATETIME values.
 * Future dependent tournament tables must use restrictive foreign keys to tournaments.
 */
export class CreateTournaments1795300000000 implements MigrationInterface {
  name = 'CreateTournaments1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`tournaments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`sport_id\` int NOT NULL,
        \`registration_starts_at\` datetime(3) NOT NULL,
        \`registration_ends_at\` datetime(3) NOT NULL,
        \`starts_at\` datetime(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_tournaments_sport_id\` (\`sport_id\`),
        CONSTRAINT \`CHK_tournaments_name_not_blank\`
          CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(\`name\`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
        CONSTRAINT \`CHK_tournaments_registration_dates\`
          CHECK (\`registration_starts_at\` < \`registration_ends_at\`),
        CONSTRAINT \`CHK_tournaments_registration_before_start\`
          CHECK (\`registration_ends_at\` <= \`starts_at\`),
        CONSTRAINT \`FK_tournaments_sport_id\`
          FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `tournaments` DROP FOREIGN KEY `FK_tournaments_sport_id`');
    await queryRunner.query('DROP TABLE `tournaments`');
  }
}
