import {
  Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';

/**
 * Anotacion realizada por un jugador durante un partido. team_id es el equipo participante con el
 * que el jugador anoto. Las tres FK son RESTRICT: eliminar una anotacion nunca elimina al jugador,
 * al equipo ni al partido, y la relacion se conserva mientras la anotacion exista.
 */
@Entity('match_annotations')
@Index('IDX_match_annotations_match_minute', ['matchId', 'minute'])
@Index('IDX_match_annotations_player_id', ['playerId'])
@Index('IDX_match_annotations_team_id', ['teamId'])
@Check('CHK_match_annotations_minute', '`minute` IS NULL OR (`minute` >= 0 AND `minute` <= 300)')
@Check('CHK_match_annotations_points', '`points` >= 1 AND `points` <= 100')
export class MatchAnnotation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'match_id', type: 'int' })
  matchId!: number;

  @Column({ name: 'player_id', type: 'int' })
  playerId!: number;

  @Column({ name: 'team_id', type: 'int' })
  teamId!: number;

  @Column({ type: 'int', nullable: true })
  minute!: number | null;

  @Column({ type: 'int', default: 1 })
  points!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  description!: string | null;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => Match, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'FK_match_annotations_match_id' })
  match!: Match;

  @ManyToOne(() => Player, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'player_id', foreignKeyConstraintName: 'FK_match_annotations_player_id' })
  player!: Player;

  @ManyToOne(() => Team, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'FK_match_annotations_team_id' })
  team!: Team;
}
