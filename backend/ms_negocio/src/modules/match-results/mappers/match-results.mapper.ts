import { Injectable } from '@nestjs/common';
import { DEFAULT_MATCH_STATUS, MatchStatus } from '../../match-management/dto/match-status';
import { MatchDetail } from '../../match-management/entities/match-detail.entity';
import { Match } from '../../matches/entities/match.entity';
import { CreateMatchAnnotationDto } from '../dto/create-match-annotation.dto';
import { MatchAnnotationResponseDto } from '../dto/match-annotation-response.dto';
import { MatchResultResponseDto } from '../dto/match-result-response.dto';
import { MatchAnnotation } from '../entities/match-annotation.entity';
import { MatchResult } from '../entities/match-result.entity';

@Injectable()
export class MatchResultsMapper {
  toResultEntity(matchId: number, homeScore: number, awayScore: number, now: Date): MatchResult {
    const result = new MatchResult();
    result.matchId = matchId;
    result.homeScore = homeScore;
    result.awayScore = awayScore;
    result.updatedAt = now;
    return result;
  }

  toAnnotationEntity(
    matchId: number,
    teamId: number,
    dto: CreateMatchAnnotationDto,
    now: Date,
  ): MatchAnnotation {
    const annotation = new MatchAnnotation();
    annotation.matchId = matchId;
    annotation.playerId = dto.playerId;
    annotation.teamId = teamId;
    annotation.minute = dto.minute ?? null;
    annotation.points = dto.points ?? 1;
    annotation.description = dto.description ?? null;
    annotation.createdAt = now;
    return annotation;
  }

  /** Requiere el partido con fase, local y visitante cargados. */
  toResultResponseDto(match: Match, detail: MatchDetail | null, result: MatchResult): MatchResultResponseDto {
    const status: MatchStatus = detail?.status ?? DEFAULT_MATCH_STATUS;
    return {
      id: result.id,
      matchId: match.id,
      tournamentId: match.phase.tournamentId,
      matchStatus: status,
      homeTeamId: match.homeTeamId,
      homeTeamName: match.homeTeam.name,
      homeScore: result.homeScore,
      awayTeamId: match.awayTeamId,
      awayTeamName: match.awayTeam.name,
      awayScore: result.awayScore,
      winnerTeamId: result.homeScore === result.awayScore
        ? null
        : result.homeScore > result.awayScore ? match.homeTeamId : match.awayTeamId,
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  /** Requiere la anotacion con jugador y equipo cargados y el partido con su fase. */
  toAnnotationResponseDto(match: Match, annotation: MatchAnnotation): MatchAnnotationResponseDto {
    return {
      id: annotation.id,
      matchId: annotation.matchId,
      tournamentId: match.phase.tournamentId,
      playerId: annotation.playerId,
      playerName: annotation.player.name,
      teamId: annotation.teamId,
      teamName: annotation.team.name,
      minute: annotation.minute,
      points: annotation.points,
      description: annotation.description,
      createdAt: annotation.createdAt.toISOString(),
    };
  }

  toAnnotationResponseDtoList(match: Match, annotations: MatchAnnotation[]): MatchAnnotationResponseDto[] {
    return annotations.map(annotation => this.toAnnotationResponseDto(match, annotation));
  }
}
