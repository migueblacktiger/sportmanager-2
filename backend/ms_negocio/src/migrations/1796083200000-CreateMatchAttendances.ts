import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-06. Participacion de aficionados en partidos. fan_id es el id de usuario de ms_security
 * (sin FK). La FK a matches es RESTRICT: un partido con participaciones no se puede eliminar.
 */
export class CreateMatchAttendances1796083200000 implements MigrationInterface {
  name = 'CreateMatchAttendances1796083200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`match_attendances\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`match_id\` int NOT NULL,
        \`fan_id\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_match_attendances_match_fan\` (\`match_id\`, \`fan_id\`),
        INDEX \`IDX_match_attendances_fan_id\` (\`fan_id\`),
        CONSTRAINT \`FK_match_attendances_match_id\`
          FOREIGN KEY (\`match_id\`) REFERENCES \`matches\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `match_attendances`');
  }
}
