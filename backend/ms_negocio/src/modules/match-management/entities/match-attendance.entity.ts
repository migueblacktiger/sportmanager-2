import {
  Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';

/**
 * Participacion de un aficionado en un partido. fan_id es el id del usuario en ms_security
 * (alli se registra y se le asigna rol); no hay FK porque esa base es ajena a este servicio.
 * La FK a matches es RESTRICT: un partido con participaciones no se elimina.
 */
@Entity('match_attendances')
@Index('UQ_match_attendances_match_fan', ['matchId', 'fanId'], { unique: true })
@Index('IDX_match_attendances_fan_id', ['fanId'])
export class MatchAttendance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'match_id', type: 'int' })
  matchId!: number;

  @Column({ name: 'fan_id', type: 'int' })
  fanId!: number;

  @ManyToOne(() => Match, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'FK_match_attendances_match_id' })
  match!: Match;
}
