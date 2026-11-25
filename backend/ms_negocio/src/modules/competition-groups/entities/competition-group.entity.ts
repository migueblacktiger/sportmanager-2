import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';

// La tabla no se llama "groups" porque GROUPS es palabra reservada en MySQL 8.
@Entity('competition_groups')
@Index('UQ_competition_groups_phase_name', ['phaseId', 'normalizedName'], { unique: true })
@Check(
  'CHK_competition_groups_name_not_blank',
  "CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(`name`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0",
)
export class CompetitionGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'phase_id', type: 'int' })
  phaseId!: number;

  @Column({ type: 'varchar', length: 180, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  name!: string;

  @Column({
    name: 'normalized_name',
    type: 'varchar',
    length: 180,
    charset: 'utf8mb4',
    collation: 'utf8mb4_bin',
    asExpression: 'LOWER(TRIM(`name`))',
    generatedType: 'STORED',
    select: false,
    insert: false,
    update: false,
  })
  readonly normalizedName!: string;

  @ManyToOne(() => TournamentPhase, {
    nullable: false, cascade: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    orphanedRowAction: 'disable',
  })
  @JoinColumn({ name: 'phase_id', foreignKeyConstraintName: 'FK_competition_groups_phase_id' })
  phase!: TournamentPhase;
}
