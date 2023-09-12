import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  DeepPartial,
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => CategoryEntity, (category) => category.children)
  parent?: DeepPartial<CategoryEntity> | null;

  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children?: DeepPartial<CategoryEntity>[] | null;

  @ManyToMany(() => PostEntity)
  posts?: PostEntity[] | null;

  @ManyToMany(() => TopicEntity)
  topics?: TopicEntity[] | null;
}
