import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { PhaseType } from '../dto/phase-type';

@Entity('tournament_phases')
@Index('UQ_tournament_phases_tournament_order', ['tournamentId', 'phaseOrder'], { unique: true })
@Check(
  'CHK_tournament_phases_name_not_blank',
  "CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(`name`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0",
)
@Check('CHK_tournament_phases_order_positive', '`phase_order` >= 1')
@Check('CHK_tournament_phases_type', "`phase_type` IN ('groups', 'league', 'knockout', 'final')")
export class TournamentPhase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'tournament_id', type: 'int' })
  tournamentId!: number;

  @Column({ type: 'varchar', length: 180, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  name!: string;

  @Column({
    name: 'phase_type', type: 'varchar', length: 20, charset: 'utf8mb4', collation: 'utf8mb4_bin',
  })
  type!: PhaseType;

  @Column({ name: 'phase_order', type: 'int' })
  phaseOrder!: number;

  @ManyToOne(() => Tournament, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'tournament_id', foreignKeyConstraintName: 'FK_tournament_phases_tournament_id' })
  tournament!: Tournament;
}
