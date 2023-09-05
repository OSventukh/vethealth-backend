import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly page = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly size = 5;
}
