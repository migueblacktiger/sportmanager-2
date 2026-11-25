import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompetitionGroup } from '../../competition-groups/entities/competition-group.entity';
import { Team } from '../../teams/entities/team.entity';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';

/**
 * phase_id repite la fase del grupo (inmutable) para que MySQL garantice con un indice unico
 * que un equipo solo este en un grupo por fase. El Service asegura que coincida con el grupo.
 */
@Entity('group_teams')
@Index('UQ_group_teams_group_team', ['groupId', 'teamId'], { unique: true })
@Index('UQ_group_teams_phase_team', ['phaseId', 'teamId'], { unique: true })
@Index('IDX_group_teams_team_id', ['teamId'])
export class GroupTeam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'group_id', type: 'int' })
  groupId!: number;

  @Column({ name: 'phase_id', type: 'int' })
  phaseId!: number;

  @Column({ name: 'team_id', type: 'int' })
  teamId!: number;

  @ManyToOne(() => CompetitionGroup, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'FK_group_teams_group_id' })
  group!: CompetitionGroup;

  @ManyToOne(() => TournamentPhase, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'phase_id', foreignKeyConstraintName: 'FK_group_teams_phase_id' })
  phase!: TournamentPhase;

  @ManyToOne(() => Team, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'FK_group_teams_team_id' })
  team!: Team;
}
