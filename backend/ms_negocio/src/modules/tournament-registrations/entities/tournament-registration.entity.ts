import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';

@Entity('tournament_registrations')
@Index('UQ_tournament_registrations_tournament_team', ['tournamentId', 'teamId'], { unique: true })
@Index('IDX_tournament_registrations_team_id', ['teamId'])
export class TournamentRegistration {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'tournament_id', type: 'int' })
  tournamentId!: number;

  @Column({ name: 'team_id', type: 'int' })
  teamId!: number;

  @ManyToOne(() => Tournament, {
    nullable: false,
    cascade: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'tournament_id',
    foreignKeyConstraintName: 'FK_tournament_registrations_tournament_id',
  })
  tournament!: Tournament;

  @ManyToOne(() => Team, {
    nullable: false,
    cascade: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'FK_tournament_registrations_team_id',
  })
  team!: Team;
}
