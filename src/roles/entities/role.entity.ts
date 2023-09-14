import { Entity, PrimaryColumn, Column } from 'typeorm';
import { Allow } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'roles' })
export class RoleEntity {
  @ApiProperty({ example: 1 })
  @PrimaryColumn()
  id: number;

  @ApiProperty({ example: 'Admin' })
  @Column()
  @Allow()
  name: string;
}
