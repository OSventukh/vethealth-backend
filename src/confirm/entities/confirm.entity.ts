import { UserEntity } from '@/users/entities/user.entity';
import { Allow } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'confirm' })
export class ConfirmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Allow()
  @Column()
  @Index()
  hash: string;

  @Allow()
  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  user: UserEntity;

  @Column({ type: 'timestamp' })
  expiresIn: Date;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
