import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FileEntity } from '@/files/entities/file.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'metadata' })
export class MetadataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'meta_title' })
  metaTitle?: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'meta_description' })
  metaDescription?: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'meta_keywords' })
  metaKeywords?: string;

  @ApiProperty({ required: false })
  @ManyToOne(() => FileEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'meta_image_id' })
  metaImage?: FileEntity;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'canonical_url' })
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @Column({ default: false, name: 'no_index' })
  noIndex: boolean;

  @ApiProperty({ required: false })
  @Column({ default: false, name: 'no_follow' })
  noFollow: boolean;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'og_title' })
  ogTitle?: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'og_description' })
  ogDescription?: string;

  @ApiProperty({ required: false })
  @ManyToOne(() => FileEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'og_image_id' })
  ogImage?: FileEntity;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'twitter_title' })
  twitterTitle?: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'twitter_description' })
  twitterDescription?: string;

  @ApiProperty({ required: false })
  @ManyToOne(() => FileEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'twitter_image_id' })
  twitterImage?: FileEntity;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'twitter_card_type', default: 'summary_large_image' })
  twitterCardType?: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true, name: 'structured_data', type: 'json' })
  structuredData?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
