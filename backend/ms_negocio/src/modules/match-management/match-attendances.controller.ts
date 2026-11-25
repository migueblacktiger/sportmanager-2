import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseFilters } from '@nestjs/common';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { MatchManagementHttpExceptionFilter } from './match-management-http-exception.filter';
import { MatchAttendancesService } from './match-attendances.service';

@Controller('matches/:matchId/attendances')
@UseFilters(MatchManagementHttpExceptionFilter)
export class MatchAttendancesController {
  constructor(private readonly service: MatchAttendancesService) {}

  @Post()
  register(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: CreateAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    return this.service.register(matchId, dto);
  }

  @Get()
  findByMatch(@Param('matchId', ParseIntPipe) matchId: number): Promise<AttendanceResponseDto[]> {
    return this.service.findByMatch(matchId);
  }

  @Delete(':fanId')
  remove(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('fanId', ParseIntPipe) fanId: number,
  ): Promise<{ message: string }> {
    return this.service.remove(matchId, fanId);
  }
}
