import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';

export class SearchQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  query?: string;
}
