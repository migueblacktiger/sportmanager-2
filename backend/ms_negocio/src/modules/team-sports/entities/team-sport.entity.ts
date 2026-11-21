import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Sport } from '../../sports/entities/sport.entity';

@Entity('team_sports')
@Index('UQ_team_sports_team_sport', ['teamId', 'sportId'], { unique: true })
@Index('IDX_team_sports_sport_id', ['sportId'])
export class TeamSport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'team_id', type: 'int' })
  teamId!: number;

  @Column({ name: 'sport_id', type: 'int' })
  sportId!: number;

  @ManyToOne(() => Team, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'FK_team_sports_team_id' })
  team!: Team;

  @ManyToOne(() => Sport, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'sport_id', foreignKeyConstraintName: 'FK_team_sports_sport_id' })
  sport!: Sport;
}
