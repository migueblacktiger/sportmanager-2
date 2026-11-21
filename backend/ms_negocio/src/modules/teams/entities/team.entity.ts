import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('teams')
@Check(
  'CHK_teams_name_not_blank',
  "CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(`name`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0",
)
@Check('CHK_teams_active_boolean', '`active` IN (0, 1)')
export class Team {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 180, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  // HU-GD-03 will link teams and sports through an independent association.
  // Sports and tournament participation are not attributes of the team itself.
}
