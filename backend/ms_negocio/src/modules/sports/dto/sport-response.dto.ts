export class SportResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  active!: boolean;
  parentId!: number | null;
}
