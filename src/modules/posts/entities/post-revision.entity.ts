import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transform } from 'class-transformer';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { MetadataEntity } from '@/modules/metadata/entities/metadata.entity';
import { PostEntity } from './post.entity';

/**
 * Чому зʼявилась ревізія:
 * - `baseline` — стан поста, що існував до появи історії (знімається перед першою правкою);
 * - `create` / `update` — збереження з адмінки;
 * - `restore` — відновлення попередньої ревізії (`restoredFromId`).
 */
export const PostRevisionReason = {
  Baseline: 'baseline',
  Create: 'create',
  Update: 'update',
  Restore: 'restore',
} as const;
export type PostRevisionReason =
  (typeof PostRevisionReason)[keyof typeof PostRevisionReason];

/** SEO-поля metadata, що потрапляють у знімок (без id/дат). */
export const POST_REVISION_METADATA_FIELDS = [
  'metaTitle',
  'metaDescription',
  'metaKeywords',
  'ogTitle',
  'ogDescription',
  'ogImage',
  'ogType',
  'twitterTitle',
  'twitterDescription',
  'twitterImage',
  'twitterCard',
  'canonicalUrl',
  'indexable',
  'followable',
  'structuredData',
] as const;
export type PostRevisionMetadata = Partial<
  Pick<MetadataEntity, (typeof POST_REVISION_METADATA_FIELDS)[number]>
>;

/**
 * Повний знімок редагованого стану поста після кожного збереження.
 * Категорії/топіки не версіонуються — історія про контент і SEO.
 */
@Entity({ name: 'post_revisions' })
@Index(['postId', 'createdAt'])
export class PostRevisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  postId: string;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'postId' })
  post?: PostEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  // Lexical JSON — MEDIUMTEXT, щоб не впертись у 64 КБ TEXT.
  @Column({ type: 'mediumtext' })
  content: string;

  @Column({ type: 'json', nullable: true })
  metadata: PostRevisionMetadata | null;

  // Без FK: файл можуть видалити з медіатеки, а ревізія має лишитись.
  @Column({ type: 'varchar', length: 36, nullable: true })
  featuredImageFileId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  featuredImageUrl: string | null;

  // Назва статусу на момент збереження (довідково, при відновленні не застосовується).
  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({ type: 'varchar', length: 20 })
  reason: PostRevisionReason;

  @Column({ type: 'varchar', length: 36, nullable: true })
  restoredFromId: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  editorId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'editorId' })
  @Transform(({ value }: { value?: UserEntity | null }) =>
    value
      ? { id: value.id, firstname: value.firstname, lastname: value.lastname }
      : null,
  )
  editor?: UserEntity | null;

  @CreateDateColumn()
  createdAt: Date;
}
