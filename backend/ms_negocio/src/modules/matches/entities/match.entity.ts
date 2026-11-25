import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';

/**
 * Un partido pertenece a una unica fase (phase_id). Asi los partidos de una fase final se
 * identifican por la fase a la que pertenecen, sin duplicar el tipo en la tabla.
 */
@Entity('matches')
@Index('IDX_matches_phase_id', ['phaseId'])
@Index('IDX_matches_home_team_id', ['homeTeamId'])
@Index('IDX_matches_away_team_id', ['awayTeamId'])
@Check('CHK_matches_teams_different', '`home_team_id` <> `away_team_id`')
export class Match {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'phase_id', type: 'int' })
  phaseId!: number;

  @Column({ name: 'home_team_id', type: 'int' })
  homeTeamId!: number;

  @Column({ name: 'away_team_id', type: 'int' })
  awayTeamId!: number;

  @Column({ name: 'scheduled_at', type: 'datetime', precision: 3 })
  scheduledAt!: Date;

  @ManyToOne(() => TournamentPhase, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'phase_id', foreignKeyConstraintName: 'FK_matches_phase_id' })
  phase!: TournamentPhase;

  @ManyToOne(() => Team, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'home_team_id', foreignKeyConstraintName: 'FK_matches_home_team_id' })
  homeTeam!: Team;

  @ManyToOne(() => Team, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'away_team_id', foreignKeyConstraintName: 'FK_matches_away_team_id' })
  awayTeam!: Team;
}
