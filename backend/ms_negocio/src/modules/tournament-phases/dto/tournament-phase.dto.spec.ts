import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTournamentPhasesDto } from './create-tournament-phases.dto';
import { UpdateTournamentPhaseDto } from './update-tournament-phase.dto';

const errorsOf = async <T extends object>(type: new () => T, plain: unknown): Promise<number> => (
  await validate(plainToInstance(type, plain) as object, {
    whitelist: true, forbidNonWhitelisted: true,
  })
).length;

describe('tournament phase DTOs', () => {
  it('accepts one or several valid phases', async () => {
    await expect(errorsOf(CreateTournamentPhasesDto, {
      phases: [{ name: 'Grupos', type: 'groups', order: 1 }],
    })).resolves.toBe(0);
    await expect(errorsOf(CreateTournamentPhasesDto, {
      phases: [
        { name: 'Grupos', type: 'groups', order: 1 },
        { name: 'Final', type: 'final', order: 2 },
      ],
    })).resolves.toBe(0);
  });

  it.each([
    ['an empty list', { phases: [] }],
    ['a missing list', {}],
    ['an unknown phase type', { phases: [{ name: 'X', type: 'otro', order: 1 }] }],
    ['a blank name', { phases: [{ name: '   ', type: 'groups', order: 1 }] }],
    ['an order below one', { phases: [{ name: 'X', type: 'groups', order: 0 }] }],
    ['a fractional order', { phases: [{ name: 'X', type: 'groups', order: 1.5 }] }],
    ['an extra property', { phases: [{ name: 'X', type: 'groups', order: 1, tournamentId: 9 }] }],
  ])('rejects %s', async (_label, plain) => {
    expect(await errorsOf(CreateTournamentPhasesDto, plain)).toBeGreaterThan(0);
  });

  it('allows partial updates but never moving a phase to another tournament', async () => {
    await expect(errorsOf(UpdateTournamentPhaseDto, { order: 3 })).resolves.toBe(0);
    await expect(errorsOf(UpdateTournamentPhaseDto, { name: null })).resolves.toBeGreaterThan(0);
    await expect(errorsOf(UpdateTournamentPhaseDto, { tournamentId: 2 })).resolves.toBeGreaterThan(0);
  });
});
