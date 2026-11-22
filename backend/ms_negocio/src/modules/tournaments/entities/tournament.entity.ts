import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sport } from '../../sports/entities/sport.entity';

@Entity('tournaments')
@Index('IDX_tournaments_sport_id', ['sportId'])
@Check(
  'CHK_tournaments_name_not_blank',
  "CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(`name`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0",
)
@Check(
  'CHK_tournaments_registration_dates',
  '`registration_starts_at` < `registration_ends_at`',
)
@Check(
  'CHK_tournaments_registration_before_start',
  '`registration_ends_at` <= `starts_at`',
)
export class Tournament {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 180, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  name!: string;

  @Column({ name: 'sport_id', type: 'int' })
  sportId!: number;

  @ManyToOne(() => Sport, {
    nullable: false,
    cascade: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'sport_id', foreignKeyConstraintName: 'FK_tournaments_sport_id' })
  sport!: Sport;

  @Column({ name: 'registration_starts_at', type: 'datetime', precision: 3 })
  registrationStartsAt!: Date;

  @Column({ name: 'registration_ends_at', type: 'datetime', precision: 3 })
  registrationEndsAt!: Date;

  @Column({ name: 'starts_at', type: 'datetime', precision: 3 })
  startsAt!: Date;
}
