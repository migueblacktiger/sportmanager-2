import {
  Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { MatchAudienceSource } from '../match-audience-source';

@Entity('match_audiences')
@Index('IDX_match_audiences_match_source', ['matchId', 'source'])
@Unique('UQ_match_audiences_match_source_fan', ['matchId', 'source', 'fanId'])
@Check('CHK_match_audiences_source', "`source` IN ('tickets', 'bets')")
export class MatchAudience {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'match_id', type: 'int' })
  matchId!: number;

  @Column({ name: 'fan_id', type: 'int' })
  fanId!: number;

  @Column({ type: 'varchar', length: 7 })
  source!: MatchAudienceSource;

  @CreateDateColumn({ name: 'registered_at', type: 'datetime', precision: 3 })
  registeredAt!: Date;

  @ManyToOne(() => Match, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'FK_match_audiences_match_id' })
  match!: Match;
}
