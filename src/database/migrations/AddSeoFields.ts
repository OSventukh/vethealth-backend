import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeoFields1734267600000 implements MigrationInterface {
  name = 'AddSeoFields1734267600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add SEO fields to topics table
    await queryRunner.query(`
      ALTER TABLE "topics" 
      ADD "meta_title" character varying,
      ADD "meta_description" character varying,
      ADD "meta_keywords" character varying,
      ADD "meta_image_id" uuid,
      ADD "canonical_url" character varying,
      ADD "no_index" boolean NOT NULL DEFAULT false,
      ADD "no_follow" boolean NOT NULL DEFAULT false
    `);

    // Add SEO fields to posts table
    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD "meta_title" character varying,
      ADD "meta_description" character varying,
      ADD "meta_keywords" character varying,
      ADD "meta_image_id" uuid,
      ADD "canonical_url" character varying,
      ADD "no_index" boolean NOT NULL DEFAULT false,
      ADD "no_follow" boolean NOT NULL DEFAULT false
    `);

    // Add SEO fields to categories table
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD "meta_title" character varying,
      ADD "meta_description" character varying,
      ADD "meta_keywords" character varying,
      ADD "meta_image_id" uuid,
      ADD "canonical_url" character varying,
      ADD "no_index" boolean NOT NULL DEFAULT false,
      ADD "no_follow" boolean NOT NULL DEFAULT false
    `);

    // Add SEO fields to pages table
    await queryRunner.query(`
      ALTER TABLE "pages" 
      ADD "meta_title" character varying,
      ADD "meta_description" character varying,
      ADD "meta_keywords" character varying,
      ADD "meta_image_id" uuid,
      ADD "canonical_url" character varying,
      ADD "no_index" boolean NOT NULL DEFAULT false,
      ADD "no_follow" boolean NOT NULL DEFAULT false
    `);

    // Add foreign key constraints for meta_image_id
    await queryRunner.query(`
      ALTER TABLE "topics" 
      ADD CONSTRAINT "FK_topics_meta_image" 
      FOREIGN KEY ("meta_image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD CONSTRAINT "FK_posts_meta_image" 
      FOREIGN KEY ("meta_image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD CONSTRAINT "FK_categories_meta_image" 
      FOREIGN KEY ("meta_image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "pages" 
      ADD CONSTRAINT "FK_pages_meta_image" 
      FOREIGN KEY ("meta_image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(`ALTER TABLE "topics" DROP CONSTRAINT "FK_topics_meta_image"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_meta_image"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_meta_image"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP CONSTRAINT "FK_pages_meta_image"`);

    // Remove SEO fields from all tables
    await queryRunner.query(`
      ALTER TABLE "topics" 
      DROP COLUMN "meta_title",
      DROP COLUMN "meta_description",
      DROP COLUMN "meta_keywords",
      DROP COLUMN "meta_image_id",
      DROP COLUMN "canonical_url",
      DROP COLUMN "no_index",
      DROP COLUMN "no_follow"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" 
      DROP COLUMN "meta_title",
      DROP COLUMN "meta_description",
      DROP COLUMN "meta_keywords",
      DROP COLUMN "meta_image_id",
      DROP COLUMN "canonical_url",
      DROP COLUMN "no_index",
      DROP COLUMN "no_follow"
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "meta_title",
      DROP COLUMN "meta_description",
      DROP COLUMN "meta_keywords",
      DROP COLUMN "meta_image_id",
      DROP COLUMN "canonical_url",
      DROP COLUMN "no_index",
      DROP COLUMN "no_follow"
    `);

    await queryRunner.query(`
      ALTER TABLE "pages" 
      DROP COLUMN "meta_title",
      DROP COLUMN "meta_description",
      DROP COLUMN "meta_keywords",
      DROP COLUMN "meta_image_id",
      DROP COLUMN "canonical_url",
      DROP COLUMN "no_index",
      DROP COLUMN "no_follow"
    `);
  }
}
