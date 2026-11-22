import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Player } from './entities/player.entity';
import { PlayerMapper } from './mappers/player.mapper';
import { PlayersRepository } from './repositories/players.repository';
import { PlayersService } from './players.service';

describe('PlayersService', () => {
  const repository = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn(), remove: jest.fn(), existsByIdentification: jest.fn() };
  let service: PlayersService;
  let player: Player;
  const dbError = (code: string) => new QueryFailedError('statement', [], Object.assign(new Error(), { code }));

  beforeEach(async () => {
    jest.resetAllMocks();
    player = Object.assign(new Player(), { id: 7, name: 'Ana Perez', description: null, identification: null, active: true });
    const module = await Test.createTestingModule({
      providers: [PlayersService, PlayerMapper, { provide: PlayersRepository, useValue: repository }],
    }).compile();
    service = module.get(PlayersService);
    repository.findById.mockResolvedValue(player);
    repository.existsByIdentification.mockResolvedValue(false);
    repository.save.mockImplementation(async (entity: Player) => Object.assign(entity, { id: entity.id ?? 7, active: entity.active ?? true }));
    repository.remove.mockResolvedValue(true);
  });

  it('creates a player with the database active default and public response', async () => {
    await expect(service.create({ name: player.name })).resolves.toEqual(player);
    expect(repository.save).toHaveBeenCalledWith(expect.any(Player));
  });

  it('allows homonymous players without using the name as identity', async () => {
    await service.create({ name: player.name });
    await service.create({ name: player.name });
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('checks a supplied identification before creating and trims it in the mapper', async () => {
    await expect(service.create({ name: player.name, identification: ' ABC-123 ' })).resolves.toMatchObject({ identification: 'ABC-123' });
    expect(repository.existsByIdentification).toHaveBeenCalledWith(' ABC-123 ', undefined);
  });

  it('rejects an existing identification without saving', async () => {
    repository.existsByIdentification.mockResolvedValue(true);
    await expect(service.create({ name: player.name, identification: 'abc-123' })).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('excludes the current player from the duplicate check on update', async () => {
    await service.update(7, { identification: 'ABC-123' });
    expect(repository.existsByIdentification).toHaveBeenCalledWith('ABC-123', 7);
  });

  it('rejects a duplicate identification on update', async () => {
    repository.existsByIdentification.mockResolvedValue(true);
    await expect(service.update(7, { identification: 'abc-123' })).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows clearing identification without querying duplicates', async () => {
    player.identification = 'ABC-123';
    await expect(service.update(7, { identification: null })).resolves.toMatchObject({ identification: null });
    expect(repository.existsByIdentification).not.toHaveBeenCalled();
  });

  it('translates concurrent duplicate insertions into 409', async () => {
    repository.save.mockRejectedValue(dbError('ER_DUP_ENTRY'));
    await expect(service.create({ name: player.name, identification: 'ABC-123' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists players', async () => {
    repository.findAll.mockResolvedValue([player]);
    await expect(service.findAll()).resolves.toEqual([player]);
  });

  it('returns an empty list when no players exist', async () => {
    repository.findAll.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('finds a player by id', async () => {
    await expect(service.findOne(7)).resolves.toEqual(player);
    expect(repository.findById).toHaveBeenCalledWith(7);
  });

  it.each(['findOne', 'update', 'remove'] as const)('returns 404 for a missing player in %s', async (operation) => {
    repository.findById.mockResolvedValue(null);
    await expect(operation === 'update' ? service.update(7, { name: 'Otro' }) : service[operation](7)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.NaN, 2147483648])('rejects invalid id %s before persistence', async (id) => {
    await expect(service.findOne(id)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('updates basic data and preserves omitted values', async () => {
    await expect(service.update(7, { name: 'Ana Gomez' })).resolves.toEqual({ ...player, name: 'Ana Gomez' });
    expect(player.description).toBeNull();
    expect(player.active).toBe(true);
  });

  it('allows clearing the description', async () => {
    player.description = 'Descripcion';
    await expect(service.update(7, { description: null })).resolves.toMatchObject({ description: null });
  });

  it.each([false, true])('sets active to %s without deleting the player', async (active) => {
    await expect(service.update(7, { active })).resolves.toMatchObject({ active });
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('removes only the player requested', async () => {
    await expect(service.remove(7)).resolves.toEqual({ message: 'Jugador #7 eliminado correctamente' });
    expect(repository.remove).toHaveBeenCalledWith(7);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each(['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED'])('returns 409 when related information prevents deletion (%s)', async (code) => {
    repository.remove.mockRejectedValue(dbError(code));
    await expect(service.remove(7)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 if the player disappears before deletion', async () => {
    repository.remove.mockResolvedValue(false);
    await expect(service.remove(7)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propagates unexpected deletion failures', async () => {
    const error = new Error('Unexpected database failure');
    repository.remove.mockRejectedValue(error);
    await expect(service.remove(7)).rejects.toBe(error);
  });

  it('propagates unexpected save failures', async () => {
    const error = new Error('Unexpected database failure');
    repository.save.mockRejectedValue(error);
    await expect(service.create({ name: player.name })).rejects.toBe(error);
  });
});
