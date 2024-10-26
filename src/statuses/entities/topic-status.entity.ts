import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { Transform } from 'class-transformer';

@Entity({ name: 'topic-statuses' })
export class TopicStatusEntity {
  @ApiProperty({ example: 1 })
  @PrimaryColumn()
  @Transform(({ obj }) => obj.id.toString())
  id: number;

  @ApiProperty({ example: 'Active' })
  @Allow()
  @Column()
  name: string;
}
