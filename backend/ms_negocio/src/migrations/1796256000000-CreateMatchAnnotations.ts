import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-GC-07. Anotaciones de un partido, cada una asociada al jugador que la realizo y al equipo
 * participante con el que anoto. Todas las FK son RESTRICT: borrar una anotacion no borra al jugador,
 * al equipo ni al partido, y la anotacion impide borrar a cualquiera de ellos.
 */
export class CreateMatchAnnotations1796256000000 implements MigrationInterface {
  name = 'CreateMatchAnnotations1796256000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`match_annotations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`match_id\` int NOT NULL,
        \`player_id\` int NOT NULL,
        \`team_id\` int NOT NULL,
        \`minute\` int NULL,
        \`points\` int NOT NULL DEFAULT 1,
        \`description\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
        \`created_at\` datetime(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_match_annotations_match_minute\` (\`match_id\`, \`minute\`),
        INDEX \`IDX_match_annotations_player_id\` (\`player_id\`),
        INDEX \`IDX_match_annotations_team_id\` (\`team_id\`),
        CONSTRAINT \`CHK_match_annotations_minute\`
          CHECK (\`minute\` IS NULL OR (\`minute\` >= 0 AND \`minute\` <= 300)),
        CONSTRAINT \`CHK_match_annotations_points\`
          CHECK (\`points\` >= 1 AND \`points\` <= 100),
        CONSTRAINT \`FK_match_annotations_match_id\`
          FOREIGN KEY (\`match_id\`) REFERENCES \`matches\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_match_annotations_player_id\`
          FOREIGN KEY (\`player_id\`) REFERENCES \`players\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`FK_match_annotations_team_id\`
          FOREIGN KEY (\`team_id\`) REFERENCES \`teams\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `match_annotations`');
  }
}
