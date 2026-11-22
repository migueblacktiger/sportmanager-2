import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('players')
@Index('UQ_players_normalized_identification', ['normalizedIdentification'], { unique: true })
@Check('CHK_players_identification_not_blank', '`identification` IS NULL OR CHAR_LENGTH(TRIM(`identification`)) > 0')
@Check(
  'CHK_players_name_not_blank',
  "CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(`name`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0",
)
@Check('CHK_players_active_boolean', '`active` IN (0, 1)')
export class Player {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 180, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  name!: string;

  @Column({ type: 'varchar', length: 80, nullable: true, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  identification!: string | null;

  // Multiple NULL values are allowed; supplied identifiers are unique even for inactive players.
  @Column({ name: 'normalized_identification', type: 'varchar', length: 80,
    charset: 'utf8mb4', collation: 'utf8mb4_bin', nullable: true,
    asExpression: 'LOWER(TRIM(`identification`))', generatedType: 'STORED',
    select: false, insert: false, update: false })
  readonly normalizedIdentification!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

}
