import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthPendingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  confirmationToken: string;
}
