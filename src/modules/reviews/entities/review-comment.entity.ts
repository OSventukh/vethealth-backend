import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ReviewEntity } from './review.entity';

@Entity({ name: 'review-comments' })
export class ReviewCommentEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ReviewEntity, (review) => review.comments)
  review: ReviewEntity;
}
