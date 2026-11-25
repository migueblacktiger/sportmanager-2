import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Escenario (sede) donde se disputa un partido. */
@Entity('venues')
@Index('UQ_venues_normalized_name', ['normalizedName'], { unique: true })
@Check(
  'CHK_venues_name_not_blank',
  "CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(`name`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0",
)
@Check('CHK_venues_active_boolean', '`active` IN (0, 1)')
export class Venue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 180, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  name!: string;

  // Unicidad global sin distinguir mayusculas ni espacios exteriores; la genera MySQL.
  @Column({
    name: 'normalized_name',
    type: 'varchar',
    length: 180,
    charset: 'utf8mb4',
    collation: 'utf8mb4_bin',
    asExpression: 'LOWER(TRIM(`name`))',
    generatedType: 'STORED',
    select: false,
    insert: false,
    update: false,
  })
  readonly normalizedName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  address!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
