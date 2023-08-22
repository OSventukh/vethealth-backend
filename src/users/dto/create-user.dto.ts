import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  firstname: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  lastname?: string | null;

  @ApiProperty({ example: 'test@test.com' })
  @IsEmail()
  email: string;
}
