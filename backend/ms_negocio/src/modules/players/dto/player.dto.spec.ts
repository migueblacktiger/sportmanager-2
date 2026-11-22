import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreatePlayerDto } from './create-player.dto';
import { UpdatePlayerDto } from './update-player.dto';

describe('Player DTO validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const create = (value: unknown) => pipe.transform(value, { type: 'body', metatype: CreatePlayerDto });
  const update = (value: unknown) => pipe.transform(value, { type: 'body', metatype: UpdatePlayerDto });

  it('accepts a name without identification', async () => {
    await expect(create({ name: 'Ana Perez' })).resolves.toMatchObject({ name: 'Ana Perez' });
  });

  it.each([{}, { name: null }, { name: '' }, { name: ' \t\n ' }, { name: 'a'.repeat(181) }])('rejects invalid required name %j', async (value) => {
    await expect(create(value)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['', '  ', '\t', 'a'.repeat(81), 123])('rejects invalid identification %j', async (identification) => {
    await expect(create({ name: 'Ana', identification })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts optional null identification and description', async () => {
    await expect(create({ name: 'Ana', identification: null, description: null })).resolves.toMatchObject({ identification: null, description: null });
  });

  it('allows partial update, clearing optional fields and deactivation', async () => {
    await expect(update({ identification: null, description: null, active: false })).resolves.toMatchObject({ active: false });
    await expect(update({})).resolves.toEqual({});
  });

  it.each([{ name: null }, { active: null }, { active: 'false' }, { description: 8 }, { description: 'a'.repeat(65536) }])('rejects invalid update %j', async (value) => {
    await expect(update(value)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['id', 'normalizedIdentification', 'teamId', 'userId'])('rejects internal or unrelated field %s', async (field) => {
    await expect(create({ name: 'Ana', [field]: 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(update({ [field]: 1 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
