import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';

export class AuthLoginDto {
  @ApiProperty({ example: 'test1@example.com' })
  @IsEmail()
  @Transform(lowerCaseTransformer)
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;
}
