import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '@/users/entities/user.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';

@Entity({ name: 'posts' })
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  title: string;

  @Column({ type: 'text' })
  excerpt: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  featuredImage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => PostStatusEntity, { eager: true })
  status: PostStatusEntity;

  @ManyToMany(() => CategoryEntity)
  @JoinTable({ name: 'PostCategory' })
  categories: CategoryEntity[];

  @ManyToMany(() => TopicEntity)
  @JoinTable({ name: 'PostTopic' })
  topic: TopicEntity[];

  @ManyToOne(() => UserEntity, (user) => user.posts)
  @JoinColumn({ name: 'userId' })
  author: UserEntity;
}
