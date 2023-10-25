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
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PostEntity } from '@/posts/entities/post.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';

@Entity({ name: 'categories' })
export class CategoryEntity {
  @ApiProperty({ example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' })
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
  parent?: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children?: CategoryEntity[] | null;

  @ManyToMany(() => PostEntity, (post) => post.categories)
  @JoinTable({ name: 'category_post_relation' })
  posts?: PostEntity[] | null;

  @ManyToMany(() => TopicEntity)
  @JoinTable({ name: 'topic_category_relation' })
  topics?: TopicEntity[] | null;

  @BeforeInsert()
  @BeforeUpdate()
  createSlug() {
    if (this.slug || this.name) {
      this.slug = stringToSlugTransform(this.slug || this.name);
    }
  }
}
