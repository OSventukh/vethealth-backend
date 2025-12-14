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
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import { MetadataEntity } from '@/modules/metadata/entities/metadata.entity';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';
import { Expose } from 'class-transformer';
import { RoleEnum } from '@/roles/roles.enum';

@Entity({ name: 'categories' })
export class CategoryEntity {
  @ApiProperty({ example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Expose({ groups: [RoleEnum.SuperAdmin, RoleEnum.Admin] })
  @CreateDateColumn()
  createdAt: Date;

  @Expose({ groups: [RoleEnum.SuperAdmin, RoleEnum.Admin] })
  @UpdateDateColumn()
  updatedAt: Date;

  @Expose({ groups: [RoleEnum.SuperAdmin, RoleEnum.Admin] })
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

  @ManyToOne(() => MetadataEntity, { cascade: true, nullable: true })
  @JoinColumn({ name: 'metadataId' })
  metadata?: MetadataEntity;

  @BeforeInsert()
  @BeforeUpdate()
  createSlug() {
    if (this.slug || this.name) {
      this.slug = stringToSlugTransform(this.slug || this.name);
    }
  }
}
