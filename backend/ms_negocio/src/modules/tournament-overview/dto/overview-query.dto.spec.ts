import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { OverviewQueryDto } from './overview-query.dto';

function check(input: Record<string, unknown>) {
  const dto = plainToInstance(OverviewQueryDto, input);
  return { dto, errors: validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }) };
}

describe('OverviewQueryDto', () => {
  it('accepts an empty query', () => {
    expect(check({}).errors).toHaveLength(0);
  });

  it.each([['true', true], ['false', false]])('transforms %s into a boolean', (raw, expected) => {
    const { dto, errors } = check({ includeAnnotations: raw });
    expect(errors).toHaveLength(0);
    expect(dto.includeAnnotations).toBe(expected);
  });

  it.each(['yes', '1', 'TRUE'])('rejects %s', (raw) => {
    expect(check({ includeAnnotations: raw }).errors).toHaveLength(1);
  });

  it('rejects unknown query parameters', () => {
    expect(check({ other: 'x' }).errors).toHaveLength(1);
  });
});
