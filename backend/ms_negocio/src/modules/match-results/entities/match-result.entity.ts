import {
  Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';

/**
 * Resultado de un partido (1-1 con matches). Los marcadores siguen el orden local/visitante del
 * partido. La FK a matches es RESTRICT: un partido con resultado no se elimina.
 */
@Entity('match_results')
@Index('UQ_match_results_match_id', ['matchId'], { unique: true })
@Check('CHK_match_results_scores', '`home_score` >= 0 AND `away_score` >= 0')
export class MatchResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'match_id', type: 'int' })
  matchId!: number;

  @Column({ name: 'home_score', type: 'int' })
  homeScore!: number;

  @Column({ name: 'away_score', type: 'int' })
  awayScore!: number;

  @Column({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;

  @ManyToOne(() => Match, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'FK_match_results_match_id' })
  match!: Match;
}
