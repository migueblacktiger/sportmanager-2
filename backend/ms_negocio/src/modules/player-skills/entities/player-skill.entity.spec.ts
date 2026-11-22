import { getMetadataArgsStorage } from 'typeorm';
import { PlayerSkill } from './player-skill.entity';

describe('PlayerSkill entity metadata', () => {
  it('uses two restrictive many-to-one relations without cascades', () => {
    const relations = getMetadataArgsStorage().relations
      .filter(relation => relation.target === PlayerSkill);

    expect(relations).toHaveLength(2);
    for (const relation of relations) {
      expect(relation.relationType).toBe('many-to-one');
      expect(relation.options.onDelete).toBe('RESTRICT');
      expect(relation.options.cascade).toBe(false);
    }
    expect(relations.map(relation => relation.propertyName).sort()).toEqual(['player', 'skill']);
  });

  it('defines a unique player-skill pair and a reverse-lookup index by skill', () => {
    const indices = getMetadataArgsStorage().indices
      .filter(index => index.target === PlayerSkill);

    expect(indices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'UQ_player_skills_player_skill',
        unique: true,
      }),
      expect.objectContaining({
        name: 'IDX_player_skills_skill_id',
      }),
    ]));
  });
});
