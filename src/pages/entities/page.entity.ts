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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
