import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { PostEntity } from '@/posts/entities/post.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';

@Entity({ name: 'categories' })
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @ManyToOne(() => CategoryEntity, (category) => category.children)
  parent: CategoryEntity;

  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children: CategoryEntity;

  @ManyToMany(() => PostEntity)
  posts: PostEntity[];

  @ManyToMany(() => TopicEntity)
  topics: TopicEntity[];
}
