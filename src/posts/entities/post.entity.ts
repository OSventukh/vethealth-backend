import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  AfterInsert,
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude, Expose, Transform } from 'class-transformer';
import { UserEntity } from '@/users/entities/user.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { FileEntity } from '@/files/entities/file.entity';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';
import { RoleEnum } from '@/roles/roles.enum';

@Entity({ name: 'posts' })
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ unique: true })
  slug: string;

  @Exclude({ toPlainOnly: true })
  @ManyToOne(() => FileEntity, { eager: true })
  featuredImageFile?: FileEntity;

  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  featuredImageUrl?: string;

  featuredImage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Expose({ groups: [RoleEnum.SuperAdmin, RoleEnum.Admin] })
  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => PostStatusEntity, { eager: true })
  @Transform(({ obj }: { obj: PostEntity }) => obj?.status?.name)
  status: PostStatusEntity;

  @ManyToMany(() => CategoryEntity, (category) => category.posts)
  categories: CategoryEntity[];

  @ManyToMany(() => TopicEntity, (topic) => topic.posts)
  topics: TopicEntity[];

  @ManyToOne(() => UserEntity, (user) => user.posts)
  @Transform(({ obj }: { obj: PostEntity }) => obj?.author?.firstname)
  @JoinColumn({ name: 'userId' })
  author: UserEntity;

  @AfterInsert()
  @AfterLoad()
  getFeaturedImage() {
    this.featuredImage = this.featuredImageFile?.path || this.featuredImageUrl;
  }

  @BeforeInsert()
  @BeforeUpdate()
  createSlug() {
    if (this.slug || this.title) {
      this.slug = stringToSlugTransform(this.slug || this.title);
    }
  }
}
