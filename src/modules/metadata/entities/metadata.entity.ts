import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'metadata' })
export class MetadataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  metaTitle?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  @Column({ type: 'text', nullable: true })
  metaKeywords?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ogTitle?: string;

  @Column({ type: 'text', nullable: true })
  ogDescription?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  ogImage?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ogType?: string; // article, website, etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitterTitle?: string;

  @Column({ type: 'text', nullable: true })
  twitterDescription?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  twitterImage?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  twitterCard?: string; // summary, summary_large_image, etc.

  @Column({ type: 'varchar', length: 500, nullable: true })
  canonicalUrl?: string;

  @Column({ type: 'boolean', default: true })
  indexable: boolean;

  @Column({ type: 'boolean', default: true })
  followable: boolean;

  @Column({ type: 'json', nullable: true })
  structuredData?: any; // For JSON-LD structured data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
