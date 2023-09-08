import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';

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
}
