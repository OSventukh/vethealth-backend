import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';
import { Expose } from 'class-transformer';
import { RoleEnum } from '@/roles/roles.enum';

@Entity({ name: 'pages' })
export class PageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  slug: string;

  @ManyToOne(() => PostStatusEntity, { eager: true })
  status: PostStatusEntity;

  @Expose({ groups: [RoleEnum.SuperAdmin, RoleEnum.Admin] })
  @CreateDateColumn()
  createdAt: Date;

  @Expose({ groups: [RoleEnum.SuperAdmin, RoleEnum.Admin] })
  @UpdateDateColumn()
  updatedAt: Date;

  @Expose({ groups: [RoleEnum.SuperAdmin, RoleEnum.Admin] })
  @DeleteDateColumn()
  deletedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  createSlug() {
    if (this.slug || this.title) {
      this.slug = stringToSlugTransform(this.slug || this.title);
    }
  }
}
