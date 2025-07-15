import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSeoModule1734267700000 implements MigrationInterface {
  name = 'CreateSeoModule1734267700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create SEO metadata table
    await queryRunner.query(`
      CREATE TABLE "seo_metadata" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "meta_title" character varying,
        "meta_description" character varying,
        "meta_keywords" character varying,
        "meta_image_id" uuid,
        "canonical_url" character varying,
        "no_index" boolean NOT NULL DEFAULT false,
        "no_follow" boolean NOT NULL DEFAULT false,
        "og_title" character varying,
        "og_description" character varying,
        "og_image_id" uuid,
        "twitter_title" character varying,
        "twitter_description" character varying,
        "twitter_image_id" uuid,
        "twitter_card_type" character varying DEFAULT 'summary_large_image',
        "structured_data" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seo_metadata" PRIMARY KEY ("id")
      )
    `);

    // Add SEO relationship columns to content tables
    await queryRunner.query(`ALTER TABLE "topics" ADD "seo_id" uuid`);
    await queryRunner.query(`ALTER TABLE "posts" ADD "seo_id" uuid`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "seo_id" uuid`);
    await queryRunner.query(`ALTER TABLE "pages" ADD "seo_id" uuid`);

    // Add foreign key constraints for SEO relationships
    await queryRunner.query(`
      ALTER TABLE "topics" 
      ADD CONSTRAINT "FK_topics_seo" 
      FOREIGN KEY ("seo_id") REFERENCES "seo_metadata"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD CONSTRAINT "FK_posts_seo" 
      FOREIGN KEY ("seo_id") REFERENCES "seo_metadata"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD CONSTRAINT "FK_categories_seo" 
      FOREIGN KEY ("seo_id") REFERENCES "seo_metadata"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "pages" 
      ADD CONSTRAINT "FK_pages_seo" 
      FOREIGN KEY ("seo_id") REFERENCES "seo_metadata"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Add foreign key constraints for file relationships in SEO table
    await queryRunner.query(`
      ALTER TABLE "seo_metadata" 
      ADD CONSTRAINT "FK_seo_meta_image" 
      FOREIGN KEY ("meta_image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "seo_metadata" 
      ADD CONSTRAINT "FK_seo_og_image" 
      FOREIGN KEY ("og_image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "seo_metadata" 
      ADD CONSTRAINT "FK_seo_twitter_image" 
      FOREIGN KEY ("twitter_image_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Add unique constraints for SEO relationships (one-to-one)
    await queryRunner.query(`ALTER TABLE "topics" ADD CONSTRAINT "UQ_topics_seo_id" UNIQUE ("seo_id")`);
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "UQ_posts_seo_id" UNIQUE ("seo_id")`);
    await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "UQ_categories_seo_id" UNIQUE ("seo_id")`);
    await queryRunner.query(`ALTER TABLE "pages" ADD CONSTRAINT "UQ_pages_seo_id" UNIQUE ("seo_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraints
    await queryRunner.query(`ALTER TABLE "topics" DROP CONSTRAINT "UQ_topics_seo_id"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "UQ_posts_seo_id"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "UQ_categories_seo_id"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP CONSTRAINT "UQ_pages_seo_id"`);

    // Remove foreign key constraints from SEO table
    await queryRunner.query(`ALTER TABLE "seo_metadata" DROP CONSTRAINT "FK_seo_meta_image"`);
    await queryRunner.query(`ALTER TABLE "seo_metadata" DROP CONSTRAINT "FK_seo_og_image"`);
    await queryRunner.query(`ALTER TABLE "seo_metadata" DROP CONSTRAINT "FK_seo_twitter_image"`);

    // Remove foreign key constraints from content tables
    await queryRunner.query(`ALTER TABLE "topics" DROP CONSTRAINT "FK_topics_seo"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_seo"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_seo"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP CONSTRAINT "FK_pages_seo"`);

    // Remove SEO columns from content tables
    await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "seo_id"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "seo_id"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "seo_id"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "seo_id"`);

    // Drop SEO table
    await queryRunner.query(`DROP TABLE "seo_metadata"`);
  }
}
