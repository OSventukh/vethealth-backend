import { UserEntity } from '@/users/entities/user.entity';
import { Allow } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export class ForgotEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Allow()
  @Column()
  @Index()
  hash: string;

  @Allow()
  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
