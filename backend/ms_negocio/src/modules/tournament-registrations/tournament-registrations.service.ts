import { Injectable } from '@nestjs/common';
import { CreateTournamentRegistrationsDto } from './dto/create-tournament-registrations.dto';
import { TournamentRegistrationResponseDto } from './dto/tournament-registration-response.dto';
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

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class TournamentRegistrationsService {
  constructor(
    private readonly repository: TournamentRegistrationsRepository,
    private readonly mapper: TournamentRegistrationMapper,
  ) {}

  async register(
    tournamentId: number,
    dto: CreateTournamentRegistrationsDto,
  ): Promise<TournamentRegistrationResponseDto[]> {
    this.validateId(tournamentId);
    this.validateTeamIds(dto.teamIds);
    return this.repository.transaction(async (unitOfWork) => {
      const tournament = await unitOfWork.findTournamentForUpdate(tournamentId);
      if (!tournament) throw new TournamentRegistrationTournamentNotFoundError(tournamentId);

      const now = new Date();
      if (now >= tournament.startsAt) throw new TournamentRegistrationTournamentStartedError();
      if (now < tournament.registrationStartsAt || now >= tournament.registrationEndsAt) {
        throw new TournamentRegistrationWindowClosedError();
      }

      const teams = await unitOfWork.findTeamsForUpdate(dto.teamIds);
      const existingTeamIds = new Set(teams.map(team => team.id));
      const missingTeamId = dto.teamIds.find(id => !existingTeamIds.has(id));
      if (missingTeamId !== undefined) {
        throw new TournamentRegistrationTeamNotFoundError(missingTeamId);
      }

      const associations = await unitOfWork.findTeamSportsForUpdate(
        dto.teamIds,
        tournament.sportId,
      );
      const associatedTeamIds = new Set(associations.map(association => association.teamId));
      const incompatibleTeamId = dto.teamIds.find(id => !associatedTeamIds.has(id));
      if (incompatibleTeamId !== undefined) {
        throw new TournamentRegistrationSportMismatchError(
          incompatibleTeamId,
          tournament.sportId,
        );
      }

      const alreadyRegistered = new Set(
        await unitOfWork.findExistingTeamIds(tournamentId, dto.teamIds),
      );
      const duplicateTeamId = dto.teamIds.find(id => alreadyRegistered.has(id));
      if (duplicateTeamId !== undefined) {
        throw new TournamentRegistrationDuplicateError(duplicateTeamId, tournamentId);
      }

      return this.mapper.toResponseDtoList(
        await unitOfWork.insertMany(tournamentId, dto.teamIds),
      );
    });
  }

  async findByTournament(tournamentId: number): Promise<TournamentRegistrationResponseDto[]> {
    this.validateId(tournamentId);
    if (!await this.repository.findTournament(tournamentId)) {
      throw new TournamentRegistrationTournamentNotFoundError(tournamentId);
    }
    return this.mapper.toResponseDtoList(await this.repository.findByTournament(tournamentId));
  }

  async findByTeam(teamId: number): Promise<TournamentRegistrationResponseDto[]> {
    this.validateId(teamId);
    if (!await this.repository.findTeam(teamId)) {
      throw new TournamentRegistrationTeamNotFoundError(teamId);
    }
    return this.mapper.toResponseDtoList(await this.repository.findByTeam(teamId));
  }

  async remove(tournamentId: number, teamId: number): Promise<{ message: string }> {
    this.validateId(tournamentId);
    this.validateId(teamId);
    return this.repository.transaction(async (unitOfWork) => {
      const tournament = await unitOfWork.findTournamentForUpdate(tournamentId);
      if (!tournament) throw new TournamentRegistrationTournamentNotFoundError(tournamentId);
      if (new Date() >= tournament.startsAt) {
        throw new TournamentRegistrationTournamentStartedError();
      }

      const registration = await unitOfWork.findRegistrationForUpdate(tournamentId, teamId);
      if (!registration) {
        throw new TournamentRegistrationNotFoundError(tournamentId, teamId);
      }
      if (!await unitOfWork.deleteRegistration(registration)) {
        throw new TournamentRegistrationNotFoundError(tournamentId, teamId);
      }
      return { message: 'Inscripcion retirada correctamente; el equipo y el torneo se conservaron' };
    });
  }

  private validateTeamIds(teamIds: number[]): void {
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw new TournamentRegistrationInputInvalidError('Debe seleccionar al menos un equipo');
    }
    if (teamIds.some(id => !Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID)) {
      throw new TournamentRegistrationInputInvalidError(
        'Los identificadores deben ser enteros positivos de hasta 2147483647',
      );
    }
    if (new Set(teamIds).size !== teamIds.length) {
      throw new TournamentRegistrationInputInvalidError(
        'La lista contiene equipos repetidos',
      );
    }
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new TournamentRegistrationInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
