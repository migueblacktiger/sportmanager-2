import { validate } from 'class-validator';
import { Team } from '../teams/entities/team.entity';
import { TeamSport } from '../team-sports/entities/team-sport.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { CreateTournamentRegistrationsDto } from './dto/create-tournament-registrations.dto';
import { TournamentRegistration } from './entities/tournament-registration.entity';
import { TournamentRegistrationMapper } from './mappers/tournament-registration.mapper';
import { TournamentRegistrationsRepository } from './repositories/tournament-registrations.repository';
import {
  TournamentRegistrationDuplicateError,
  TournamentRegistrationInputInvalidError,
  TournamentRegistrationNotFoundError,
  TournamentRegistrationSportMismatchError,
  TournamentRegistrationTeamNotFoundError,
  TournamentRegistrationTournamentNotFoundError,
  TournamentRegistrationTournamentStartedError,
  TournamentRegistrationWindowClosedError,
} from './tournament-registration.errors';
import { TournamentRegistrationsService } from './tournament-registrations.service';

const tournament = Object.assign(new Tournament(), {
  id: 8,
  name: 'Copa de prueba',
  sportId: 3,
  registrationStartsAt: new Date('2027-01-01T00:00:00.000Z'),
  registrationEndsAt: new Date('2027-01-10T00:00:00.000Z'),
  startsAt: new Date('2027-01-11T00:00:00.000Z'),
});

const registration = (teamId: number): TournamentRegistration => Object.assign(
  new TournamentRegistration(),
  {
    id: teamId + 100,
    tournamentId: tournament.id,
    teamId,
    tournament,
    team: Object.assign(new Team(), {
      id: teamId,
      name: `Equipo ${teamId}`,
      description: null,
      active: true,
    }),
  },
);

describe('TournamentRegistrationsService', () => {
  const unitOfWork = {
    findTournamentForUpdate: jest.fn(),
    findTeamsForUpdate: jest.fn(),
    findTeamSportsForUpdate: jest.fn(),
    findExistingTeamIds: jest.fn(),
    insertMany: jest.fn(),
    findRegistrationForUpdate: jest.fn(),
    deleteRegistration: jest.fn(),
  };
  const repository = {
    transaction: jest.fn(),
    findTournament: jest.fn(),
    findTeam: jest.fn(),
    findByTournament: jest.fn(),
    findByTeam: jest.fn(),
  };
  let service: TournamentRegistrationsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2027-01-05T12:00:00.000Z'));
    jest.resetAllMocks();
    repository.transaction.mockImplementation(
      (work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork),
    );
    unitOfWork.findTournamentForUpdate.mockResolvedValue(tournament);
    unitOfWork.findTeamsForUpdate.mockImplementation(async (ids: number[]) =>
      ids.map(id => Object.assign(new Team(), { id, name: `Equipo ${id}`, active: true })),
    );
    unitOfWork.findTeamSportsForUpdate.mockImplementation(async (ids: number[]) =>
      ids.map(teamId => Object.assign(new TeamSport(), { teamId, sportId: 3 })),
    );
    unitOfWork.findExistingTeamIds.mockResolvedValue([]);
    unitOfWork.insertMany.mockImplementation(async (_tournamentId: number, ids: number[]) =>
      ids.map(registration),
    );
    unitOfWork.findRegistrationForUpdate.mockResolvedValue(registration(4));
    unitOfWork.deleteRegistration.mockResolvedValue(true);
    service = new TournamentRegistrationsService(
      repository as unknown as TournamentRegistrationsRepository,
      new TournamentRegistrationMapper(),
    );
  });

  afterEach(() => jest.useRealTimers());

  it('registers a single team and returns the persisted relation data', async () => {
    await expect(service.register(8, { teamIds: [4] })).resolves.toEqual([{
      id: 104,
      tournamentId: 8,
      tournamentName: 'Copa de prueba',
      sportId: 3,
      teamId: 4,
      teamName: 'Equipo 4',
      teamActive: true,
    }]);
    expect(repository.transaction).toHaveBeenCalledTimes(1);
    expect(unitOfWork.insertMany).toHaveBeenCalledWith(8, [4]);
  });

  it('registers multiple teams atomically as one repository operation', async () => {
    await expect(service.register(8, { teamIds: [4, 7] })).resolves.toHaveLength(2);
    expect(unitOfWork.insertMany).toHaveBeenCalledTimes(1);
    expect(unitOfWork.insertMany).toHaveBeenCalledWith(8, [4, 7]);
  });

  it('allows registration exactly at the opening instant', async () => {
    jest.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));

    await expect(service.register(8, { teamIds: [4] })).resolves.toHaveLength(1);
  });

  it('does not insert any team when one member of a batch does not exist', async () => {
    unitOfWork.findTeamsForUpdate.mockResolvedValue([{ id: 4 }]);

    await expect(service.register(8, { teamIds: [4, 7] }))
      .rejects.toBeInstanceOf(TournamentRegistrationTeamNotFoundError);
    expect(unitOfWork.insertMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate ids in the request and existing registrations', async () => {
    await expect(service.register(8, { teamIds: [4, 4] }))
      .rejects.toBeInstanceOf(TournamentRegistrationInputInvalidError);
    unitOfWork.findExistingTeamIds.mockResolvedValue([7]);
    await expect(service.register(8, { teamIds: [4, 7] }))
      .rejects.toBeInstanceOf(TournamentRegistrationDuplicateError);
    expect(unitOfWork.insertMany).not.toHaveBeenCalled();
  });

  it('rejects a team without the tournament sport association', async () => {
    unitOfWork.findTeamSportsForUpdate.mockResolvedValue([{ teamId: 4, sportId: 3 }]);

    await expect(service.register(8, { teamIds: [4, 7] }))
      .rejects.toBeInstanceOf(TournamentRegistrationSportMismatchError);
    expect(unitOfWork.insertMany).not.toHaveBeenCalled();
  });

  it('rejects missing tournaments and teams', async () => {
    unitOfWork.findTournamentForUpdate.mockResolvedValue(null);
    await expect(service.register(99, { teamIds: [4] }))
      .rejects.toBeInstanceOf(TournamentRegistrationTournamentNotFoundError);

    unitOfWork.findTournamentForUpdate.mockResolvedValue(tournament);
    unitOfWork.findTeamsForUpdate.mockResolvedValue([]);
    await expect(service.register(8, { teamIds: [4] }))
      .rejects.toBeInstanceOf(TournamentRegistrationTeamNotFoundError);
  });

  it('rejects registrations before opening and after closing', async () => {
    jest.setSystemTime(new Date('2026-12-31T23:59:59.999Z'));
    await expect(service.register(8, { teamIds: [4] }))
      .rejects.toBeInstanceOf(TournamentRegistrationWindowClosedError);

    jest.setSystemTime(new Date('2027-01-10T00:00:00.000Z'));
    await expect(service.register(8, { teamIds: [4] }))
      .rejects.toBeInstanceOf(TournamentRegistrationWindowClosedError);
    expect(unitOfWork.insertMany).not.toHaveBeenCalled();
  });

  it('rejects registration after the tournament starts', async () => {
    jest.setSystemTime(new Date('2027-01-11T00:00:00.000Z'));

    await expect(service.register(8, { teamIds: [4] }))
      .rejects.toBeInstanceOf(TournamentRegistrationTournamentStartedError);
  });

  it('returns real registration data and empty lists for existing parents', async () => {
    repository.findTournament.mockResolvedValue(tournament);
    repository.findTeam.mockResolvedValue({ id: 4 });
    repository.findByTournament.mockResolvedValue([]);
    repository.findByTeam.mockResolvedValue([registration(4)]);

    await expect(service.findByTournament(8)).resolves.toEqual([]);
    await expect(service.findByTeam(4)).resolves.toMatchObject([
      { tournamentId: 8, teamId: 4, tournamentName: 'Copa de prueba' },
    ]);
  });

  it('returns not found when a query parent does not exist', async () => {
    repository.findTournament.mockResolvedValue(null);
    repository.findTeam.mockResolvedValue(null);

    await expect(service.findByTournament(99))
      .rejects.toBeInstanceOf(TournamentRegistrationTournamentNotFoundError);
    await expect(service.findByTeam(99))
      .rejects.toBeInstanceOf(TournamentRegistrationTeamNotFoundError);
  });

  it('allows withdrawal after registration closes but before tournament start', async () => {
    jest.setSystemTime(new Date('2027-01-10T12:00:00.000Z'));

    await expect(service.remove(8, 4)).resolves.toMatchObject({ message: expect.any(String) });
    expect(unitOfWork.deleteRegistration).toHaveBeenCalledWith(registration(4));
  });

  it('rejects withdrawal after tournament start', async () => {
    jest.setSystemTime(new Date('2027-01-11T00:00:00.000Z'));

    await expect(service.remove(8, 4))
      .rejects.toBeInstanceOf(TournamentRegistrationTournamentStartedError);
    expect(unitOfWork.deleteRegistration).not.toHaveBeenCalled();
  });

  it('returns 404 when the requested registration does not exist', async () => {
    unitOfWork.findRegistrationForUpdate.mockResolvedValue(null);
    await expect(service.remove(8, 4))
      .rejects.toBeInstanceOf(TournamentRegistrationNotFoundError);
  });

  it('validates a non-empty unique list of positive integer ids', async () => {
    const empty = Object.assign(new CreateTournamentRegistrationsDto(), { teamIds: [] });
    const repeated = Object.assign(new CreateTournamentRegistrationsDto(), { teamIds: [4, 4] });
    const invalid = Object.assign(new CreateTournamentRegistrationsDto(), { teamIds: [0, '7'] });

    await expect(validate(empty)).resolves.not.toHaveLength(0);
    await expect(validate(repeated)).resolves.not.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });
});
