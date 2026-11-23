import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity('player_teams')
@Index('IDX_player_teams_player_team_period', ['playerId', 'teamId', 'startDate', 'endDate'])
@Index('IDX_player_teams_team_id', ['teamId'])
@Check('CHK_player_teams_dates', '`start_date` <= `end_date`')
@Check('CHK_player_teams_date_range', "`start_date` >= '1000-01-01' AND `end_date` <= '9999-12-31'")
export class PlayerTeam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'player_id', type: 'int' })
  playerId!: number;

  @Column({ name: 'team_id', type: 'int' })
  teamId!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'finished_at', type: 'datetime', precision: 3, nullable: true })
  finishedAt!: Date | null;

  @ManyToOne(() => Player, { nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', orphanedRowAction: 'disable' })
  @JoinColumn({ name: 'player_id', foreignKeyConstraintName: 'FK_player_teams_player_id' })
  player!: Player;

  @ManyToOne(() => Team, { nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', orphanedRowAction: 'disable' })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'FK_player_teams_team_id' })
  team!: Team;
}
