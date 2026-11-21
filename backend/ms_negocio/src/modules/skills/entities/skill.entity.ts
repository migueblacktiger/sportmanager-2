import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('skills')
@Index('UQ_skills_normalized_name', ['normalizedName'], { unique: true })
@Check('CHK_skills_name_not_blank', 'CHAR_LENGTH(TRIM(`name`)) > 0')
export class Skill {
  @PrimaryGeneratedColumn()
  id!: number;

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

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
