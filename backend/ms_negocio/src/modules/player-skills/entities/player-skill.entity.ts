import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Skill } from '../../skills/entities/skill.entity';

@Entity('player_skills')
@Index('UQ_player_skills_player_skill', ['playerId', 'skillId'], { unique: true })
@Index('IDX_player_skills_skill_id', ['skillId'])
export class PlayerSkill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'player_id', type: 'int' })
  playerId!: number;

  @Column({ name: 'skill_id', type: 'int' })
  skillId!: number;

  @ManyToOne(() => Player, {
    nullable: false,
    cascade: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'player_id',
    foreignKeyConstraintName: 'FK_player_skills_player_id',
  })
  player!: Player;

  @ManyToOne(() => Skill, {
    nullable: false,
    cascade: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'skill_id',
    foreignKeyConstraintName: 'FK_player_skills_skill_id',
  })
  skill!: Skill;
}
