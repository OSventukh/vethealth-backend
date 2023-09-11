import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { PostEntity } from '@/posts/entities/post.entity';
import { UserEntity } from '@/users/entities/user.entity';
import { ReviewCommentEntity } from './review-comment.entity';
import { ReviewStatusEnum } from '../review-status.enum';

@Entity({ name: 'reviews' })
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReviewStatusEnum,
    default: ReviewStatusEnum.Pending,
  })
  status: ReviewStatusEnum;

  @OneToMany(() => ReviewCommentEntity, (comment) => comment.review)
  comments: ReviewCommentEntity[];

  @ManyToOne(() => UserEntity)
  reviewer: UserEntity;

  @OneToOne(() => PostEntity)
  post: PostEntity;
}
