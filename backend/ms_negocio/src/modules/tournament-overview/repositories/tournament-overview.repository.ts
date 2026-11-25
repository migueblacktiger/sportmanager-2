import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { CompetitionGroup } from '../../competition-groups/entities/competition-group.entity';
import { GroupTeam } from '../../group-teams/entities/group-team.entity';
import { MatchDetail } from '../../match-management/entities/match-detail.entity';
import { MatchAnnotation } from '../../match-results/entities/match-annotation.entity';
import { MatchResult } from '../../match-results/entities/match-result.entity';
import { Match } from '../../matches/entities/match.entity';
import { Sport } from '../../sports/entities/sport.entity';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';

export interface TournamentOverviewData {
  tournament: Tournament;
  sport: Sport | null;
  phases: TournamentPhase[];
  groups: CompetitionGroup[];
  groupTeams: GroupTeam[];
  matches: Match[];
  details: MatchDetail[];
  results: MatchResult[];
  /** null cuando no se solicitaron. */
  annotations: MatchAnnotation[] | null;
}

/** Solo lectura. Todas las consultas parten de las fases del torneo pedido. */
@Injectable()
export class TournamentOverviewRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Lee todo en una transaccion REPEATABLE READ para que la vista sea una foto coherente aunque se
   * registren resultados mientras se consulta. Devuelve null si el torneo no existe.
   */
  load(tournamentId: number, includeAnnotations: boolean): Promise<TournamentOverviewData | null> {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const tournament = await manager.getRepository(Tournament).findOneBy({ id: tournamentId });
      if (!tournament) return null;

      const sport = await manager.getRepository(Sport).findOneBy({ id: tournament.sportId });
      const phases = await manager.getRepository(TournamentPhase).find({
        where: { tournamentId },
        order: { phaseOrder: 'ASC', id: 'ASC' },
      });
      const data: TournamentOverviewData = {
        tournament, sport, phases, groups: [], groupTeams: [], matches: [], details: [], results: [],
        annotations: includeAnnotations ? [] : null,
      };
      if (phases.length === 0) return data;

      const phaseIds = phases.map((phase) => phase.id);
      data.groups = await manager.getRepository(CompetitionGroup).find({
        where: { phaseId: In(phaseIds) },
        order: { name: 'ASC', id: 'ASC' },
      });
      data.groupTeams = await manager.getRepository(GroupTeam).find({
        where: { phaseId: In(phaseIds) },
        relations: { team: true },
      });
      data.matches = await manager.getRepository(Match).find({
        where: { phaseId: In(phaseIds) },
        relations: { homeTeam: true, awayTeam: true },
        order: { scheduledAt: 'ASC', id: 'ASC' },
      });
      if (data.matches.length === 0) return data;

      const matchIds = data.matches.map((match) => match.id);
      data.details = await manager.getRepository(MatchDetail).find({
        where: { matchId: In(matchIds) },
        relations: { venue: true },
      });
      data.results = await manager.getRepository(MatchResult).find({ where: { matchId: In(matchIds) } });
      if (includeAnnotations) {
        data.annotations = await manager.getRepository(MatchAnnotation).find({
          where: { matchId: In(matchIds) },
          relations: { player: true, team: true },
          order: { matchId: 'ASC', id: 'ASC' },
        });
      }
      return data;
    });
  }
}
