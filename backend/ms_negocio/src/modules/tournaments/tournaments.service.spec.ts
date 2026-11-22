import { validate } from 'class-validator';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { Tournament } from './entities/tournament.entity';
import { TournamentMapper } from './mappers/tournament.mapper';
import {
  TournamentDeleteRestrictedError,
  TournamentSportChangeRestrictedError,
  TournamentSportReferenceError,
} from './repositories/tournament-repository.errors';
import { TournamentsRepository } from './repositories/tournaments.repository';
import {
  TournamentDatesInvalidError,
  TournamentHasDependenciesError,
  TournamentHasRegistrationsError,
  TournamentNotFoundError,
  TournamentSportNotFoundError,
} from './tournament.errors';
import { TournamentsService } from './tournaments.service';

const validInput = {
  name: 'Copa de prueba',
  sportId: 3,
  registrationStartsAt: '2027-01-01T10:00:00-05:00',
  registrationEndsAt: '2027-01-10T10:00:00-05:00',
  startsAt: '2027-01-11T10:00:00-05:00',
};

describe('TournamentsService', () => {
  let repository: {
    findAll: jest.Mock;
    findById: jest.Mock;
    findSportById: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let service: TournamentsService;

  const tournament = (overrides: Partial<Tournament> = {}): Tournament =>
    Object.assign(new Tournament(), {
      id: 8,
      name: validInput.name,
      sportId: validInput.sportId,
      registrationStartsAt: new Date('2027-01-01T15:00:00.000Z'),
      registrationEndsAt: new Date('2027-01-10T15:00:00.000Z'),
      startsAt: new Date('2027-01-11T15:00:00.000Z'),
    }, overrides);

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findSportById: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    service = new TournamentsService(
      repository as unknown as TournamentsRepository,
      new TournamentMapper(),
    );
  });

  it('creates a tournament with UTC-normalized dates and its existing sport', async () => {
    const saved = tournament();
    repository.findSportById.mockResolvedValue({ id: 3 });
    repository.save.mockResolvedValue(saved);

    await expect(service.create(validInput)).resolves.toEqual({
      id: 8,
      name: 'Copa de prueba',
      sportId: 3,
      registrationStartsAt: '2027-01-01T15:00:00.000Z',
      registrationEndsAt: '2027-01-10T15:00:00.000Z',
      startsAt: '2027-01-11T15:00:00.000Z',
    });
    expect(repository.findSportById).toHaveBeenCalledWith(3);
    expect(repository.save.mock.calls[0][0].registrationStartsAt.toISOString())
      .toBe('2027-01-01T15:00:00.000Z');
  });

  it('rejects a sport that does not exist', async () => {
    repository.findSportById.mockResolvedValue(null);

    await expect(service.create(validInput))
      .rejects.toBeInstanceOf(TournamentSportNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    {
      ...validInput,
      registrationStartsAt: '2027-01-10T10:00:00Z',
      registrationEndsAt: '2027-01-10T10:00:00Z',
    },
    {
      ...validInput,
      registrationEndsAt: '2027-01-12T10:00:00Z',
      startsAt: '2027-01-11T10:00:00Z',
    },
  ])('rejects an invalid date order', async (input) => {
    repository.findSportById.mockResolvedValue({ id: 3 });

    await expect(service.create(input)).rejects.toBeInstanceOf(TournamentDatesInvalidError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows registration to close exactly when the tournament starts', async () => {
    repository.findSportById.mockResolvedValue({ id: 3 });
    repository.save.mockImplementation(async (value: Tournament) => value);
    const input = {
      ...validInput,
      registrationEndsAt: validInput.startsAt,
    };

    await expect(service.create(input)).resolves.toMatchObject({
      registrationEndsAt: '2027-01-11T15:00:00.000Z',
      startsAt: '2027-01-11T15:00:00.000Z',
    });
  });

  it('lists and reads tournament DTOs', async () => {
    repository.findAll.mockResolvedValue([tournament()]);
    repository.findById.mockResolvedValue(tournament());

    await expect(service.findAll()).resolves.toHaveLength(1);
    await expect(service.findOne(8)).resolves.toMatchObject({
      id: 8, name: 'Copa de prueba', sportId: 3,
    });
  });

  it('returns not found for a missing tournament', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(TournamentNotFoundError);
  });

  it('updates dates and validates the resulting schedule', async () => {
    repository.findById.mockResolvedValue(tournament());
    repository.save.mockImplementation(async (value: Tournament) => value);

    await expect(service.update(8, {
      registrationEndsAt: '2027-01-12T10:00:00Z',
      startsAt: '2027-01-12T10:00:00Z',
    })).resolves.toMatchObject({
      registrationEndsAt: '2027-01-12T10:00:00.000Z',
      startsAt: '2027-01-12T10:00:00.000Z',
    });

    await expect(service.update(8, {
      registrationStartsAt: '2027-01-13T10:00:00Z',
    })).rejects.toBeInstanceOf(TournamentDatesInvalidError);
  });

  it('rejects changing the sport after the tournament has registrations', async () => {
    repository.findById.mockResolvedValue(tournament());
    repository.findSportById.mockResolvedValue({ id: 5 });
    repository.save.mockRejectedValue(new TournamentSportChangeRestrictedError());

    await expect(service.update(8, { sportId: 5 }))
      .rejects.toBeInstanceOf(TournamentHasRegistrationsError);
  });

  it('maps a concurrently removed sport to not found', async () => {
    repository.findSportById.mockResolvedValue({ id: 3 });
    repository.save.mockRejectedValue(new TournamentSportReferenceError());

    await expect(service.create(validInput))
      .rejects.toBeInstanceOf(TournamentSportNotFoundError);
  });

  it('deletes an unreferenced tournament and blocks referenced tournaments', async () => {
    repository.findById.mockResolvedValue(tournament());
    repository.remove.mockResolvedValue(true);
    await expect(service.remove(8)).resolves.toEqual({
      message: 'Torneo #8 eliminado correctamente',
    });

    repository.remove.mockRejectedValue(new TournamentDeleteRestrictedError());
    await expect(service.remove(8)).rejects.toBeInstanceOf(TournamentHasDependenciesError);
  });

  it('validates required fields and explicit timezone in the request DTO', async () => {
    const missing = Object.assign(new CreateTournamentDto(), {});
    await expect(validate(missing)).resolves.not.toHaveLength(0);

    const withoutTimezone = Object.assign(new CreateTournamentDto(), {
      ...validInput,
      registrationStartsAt: '2027-01-01T10:00:00',
    });
    await expect(validate(withoutTimezone)).resolves.not.toHaveLength(0);
  });
});
