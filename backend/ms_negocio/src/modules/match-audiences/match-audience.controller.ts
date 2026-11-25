import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseFilters,
} from '@nestjs/common';
import {
  MatchAudienceMemberDto, MatchAudienceRegistrationDto, RegisterMatchAudienceDto,
} from './dto/match-audience.dto';
import { MatchAudienceHttpExceptionFilter } from './match-audience-http-exception.filter';
import { MatchAudienceService } from './match-audience.service';
import { MatchAudienceSource } from './match-audience-source';

@Controller('matches/:matchId/audiences')
@UseFilters(MatchAudienceHttpExceptionFilter)
export class MatchAudienceController {
  constructor(private readonly service: MatchAudienceService) {}

  @Post('tickets')
  registerTicket(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: RegisterMatchAudienceDto,
  ): Promise<MatchAudienceRegistrationDto> {
    return this.service.register(matchId, dto.fanId, MatchAudienceSource.Tickets);
  }

  @Get('tickets')
  findTicketAudience(
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<MatchAudienceMemberDto[]> {
    return this.service.findBySource(matchId, MatchAudienceSource.Tickets);
  }

  @Delete('tickets/:fanId')
  removeTicket(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('fanId', ParseIntPipe) fanId: number,
  ): Promise<{ message: string }> {
    return this.service.remove(matchId, fanId, MatchAudienceSource.Tickets);
  }

  @Post('bets')
  registerBet(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: RegisterMatchAudienceDto,
  ): Promise<MatchAudienceRegistrationDto> {
    return this.service.register(matchId, dto.fanId, MatchAudienceSource.Bets);
  }

  @Get('bets')
  findBetAudience(
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<MatchAudienceMemberDto[]> {
    return this.service.findBySource(matchId, MatchAudienceSource.Bets);
  }

  @Delete('bets/:fanId')
  removeBet(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('fanId', ParseIntPipe) fanId: number,
  ): Promise<{ message: string }> {
    return this.service.remove(matchId, fanId, MatchAudienceSource.Bets);
  }
}
