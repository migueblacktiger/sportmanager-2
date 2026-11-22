import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayerResponseDto } from './dto/player-response.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Player } from './entities/player.entity';
import { PlayerMapper } from './mappers/player.mapper';
import { PlayersRepository } from './repositories/players.repository';

@Injectable()
export class PlayersService {
  constructor(
    private readonly playersRepository: PlayersRepository,
    private readonly playerMapper: PlayerMapper,
  ) {}

  async create(dto: CreatePlayerDto): Promise<PlayerResponseDto> {
    await this.ensureUniqueIdentification(dto.identification);
    const saved = await this.savePlayer(this.playerMapper.toEntity(dto));
    return this.playerMapper.toResponseDto(saved);
  }

  async findAll(): Promise<PlayerResponseDto[]> {
    return this.playerMapper.toResponseDtoList(await this.playersRepository.findAll());
  }

  async findOne(id: number): Promise<PlayerResponseDto> {
    return this.playerMapper.toResponseDto(await this.findPlayer(id));
  }

  async update(id: number, dto: UpdatePlayerDto): Promise<PlayerResponseDto> {
    const player = await this.findPlayer(id);
    await this.ensureUniqueIdentification(dto.identification, id);
    const saved = await this.savePlayer(this.playerMapper.mergeEntity(player, dto));
    return this.playerMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findPlayer(id);
    try {
      // Repository.delete preserves restrictive foreign keys without ORM cascades.
      if (!await this.playersRepository.remove(id)) {
        throw new NotFoundException(`Jugador con id ${id} no encontrado`);
      }
    } catch (error: unknown) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'No se puede eliminar el jugador porque tiene informacion asociada; puede desactivarlo',
        );
      }
      throw error;
    }
    return { message: `Jugador #${id} eliminado correctamente` };
  }

  private async findPlayer(id: number): Promise<Player> {
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
      throw new BadRequestException('El identificador debe ser un entero positivo de hasta 2147483647');
    }
    const player = await this.playersRepository.findById(id);
    if (!player) throw new NotFoundException(`Jugador con id ${id} no encontrado`);
    return player;
  }

  private async savePlayer(player: Player): Promise<Player> {
    try {
      return await this.playersRepository.save(player);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError && error.driverError?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya existe un jugador con esa identificacion');
      }
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'No se puede guardar el jugador porque una relacion asociada no es valida o impide el cambio',
        );
      }
      throw error;
    }
  }

  private async ensureUniqueIdentification(identification?: string | null, excludeId?: number): Promise<void> {
    if (identification != null && await this.playersRepository.existsByIdentification(identification, excludeId)) {
      throw new ConflictException('Ya existe un jugador con esa identificacion');
    }
  }

  private isForeignKeyViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && typeof driverError.code === 'string'
      && ['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2',
        'ER_ROW_IS_REFERENCED', 'ER_NO_REFERENCED_ROW'].includes(driverError.code);
  }
}
