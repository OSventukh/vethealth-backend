import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  firstname?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  lastname?: string | null;

  @ApiProperty({ example: 'test@test.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @IsOptional()
  password?: string;
}
