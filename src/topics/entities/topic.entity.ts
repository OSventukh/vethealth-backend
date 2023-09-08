import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { TopicContentEnum } from '../topic.enum';

import { PostEntity } from '@/posts/entities/post.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { PageEntity } from '@/pages/entities/page.entity';
import { UserEntity } from '@/users/entities/user.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';

@Entity({ name: 'topics' })
export class TopicEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => TopicStatusEntity)
  status: TopicStatusEntity;

  @Column()
  slug: string;

  @Column({ type: 'enum', enum: TopicContentEnum })
  content: TopicContentEnum;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToMany(() => PostEntity)
  posts: PostEntity[];

  @ManyToMany(() => CategoryEntity)
  @JoinTable({ name: 'TopicCategory' })
  categories: CategoryEntity[];

  @ManyToOne(() => PageEntity)
  page: PageEntity;

  @ManyToOne(() => TopicEntity, (topic) => topic.children)
  parent: TopicEntity;

  @OneToMany(() => TopicEntity, (topic) => topic.parent)
  children: TopicEntity;

  @ManyToMany(() => UserEntity)
  users: UserEntity[];
}
