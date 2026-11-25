import {
  Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { MatchStatus } from '../dto/match-status';

/**
 * Informacion de gestion de un partido (estado y escenario), en relacion 1-1 con matches.
 * Vive en su propia tabla para no alterar la tabla ni el modulo base de partidos.
 * ON DELETE CASCADE: al eliminar el partido se elimina su detalle (nunca al reves).
 */
@Entity('match_details')
@Index('UQ_match_details_match_id', ['matchId'], { unique: true })
@Index('IDX_match_details_venue_id', ['venueId'])
@Check(
  'CHK_match_details_status',
  "`status` IN ('scheduled', 'in_progress', 'finished', 'cancelled', 'postponed')",
)
export class MatchDetail {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'match_id', type: 'int' })
  matchId!: number;

  @Column({ name: 'venue_id', type: 'int', nullable: true })
  venueId!: number | null;

  @Column({
    type: 'varchar', length: 20, charset: 'utf8mb4', collation: 'utf8mb4_bin', default: MatchStatus.Scheduled,
  })
  status!: MatchStatus;

  @ManyToOne(() => Match, {
    nullable: false, cascade: false, onDelete: 'CASCADE', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'FK_match_details_match_id' })
  match!: Match;

  @ManyToOne(() => Venue, {
    nullable: true, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'venue_id', foreignKeyConstraintName: 'FK_match_details_venue_id' })
  venue!: Venue | null;
}
