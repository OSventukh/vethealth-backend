import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSeoModule1734267700000 implements MigrationInterface {
  name = 'CreateSeoModule1734267700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create seo_metadata table
    await queryRunner.query(`
      CREATE TABLE \`seo_metadata\` (
        \`id\` varchar(36) NOT NULL,
        \`meta_title\` varchar(255) NULL,
        \`meta_description\` varchar(255) NULL,
        \`meta_keywords\` varchar(255) NULL,
        \`meta_image_id\` varchar(36) NULL,
        \`canonical_url\` varchar(255) NULL,
        \`no_index\` tinyint NOT NULL DEFAULT 0,
        \`no_follow\` tinyint NOT NULL DEFAULT 0,
        \`og_title\` varchar(255) NULL,
        \`og_description\` varchar(255) NULL,
        \`og_image_id\` varchar(36) NULL,
        \`twitter_title\` varchar(255) NULL,
        \`twitter_description\` varchar(255) NULL,
        \`twitter_image_id\` varchar(36) NULL,
        \`twitter_card_type\` varchar(255) NULL DEFAULT 'summary_large_image',
        \`structured_data\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Add seo_id foreign key columns to all entities
    await queryRunner.query(`ALTER TABLE \`categories\` ADD \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`topics\` ADD \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD \`seo_id\` varchar(36) NULL`);

    // Add unique constraints
    await queryRunner.query(`ALTER TABLE \`categories\` ADD UNIQUE INDEX \`IDX_seo_categories\` (\`seo_id\`)`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD UNIQUE INDEX \`IDX_seo_posts\` (\`seo_id\`)`);
    await queryRunner.query(`ALTER TABLE \`topics\` ADD UNIQUE INDEX \`IDX_seo_topics\` (\`seo_id\`)`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD UNIQUE INDEX \`IDX_seo_pages\` (\`seo_id\`)`);

    // Add foreign key constraints
    await queryRunner.query(`ALTER TABLE \`seo_metadata\` ADD CONSTRAINT \`FK_seo_meta_image\` FOREIGN KEY (\`meta_image_id\`) REFERENCES \`files\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`seo_metadata\` ADD CONSTRAINT \`FK_seo_og_image\` FOREIGN KEY (\`og_image_id\`) REFERENCES \`files\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`seo_metadata\` ADD CONSTRAINT \`FK_seo_twitter_image\` FOREIGN KEY (\`twitter_image_id\`) REFERENCES \`files\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_seo\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_seo\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_seo\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_seo\``);
    
    await queryRunner.query(`ALTER TABLE \`seo_metadata\` DROP FOREIGN KEY \`FK_seo_twitter_image\``);
    await queryRunner.query(`ALTER TABLE \`seo_metadata\` DROP FOREIGN KEY \`FK_seo_og_image\``);
    await queryRunner.query(`ALTER TABLE \`seo_metadata\` DROP FOREIGN KEY \`FK_seo_meta_image\``);

    // Remove unique constraints
    await queryRunner.query(`ALTER TABLE \`pages\` DROP INDEX \`IDX_seo_pages\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP INDEX \`IDX_seo_topics\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP INDEX \`IDX_seo_posts\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP INDEX \`IDX_seo_categories\``);

    // Remove seo_id columns
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`seo_id\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP COLUMN \`seo_id\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`seo_id\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`seo_id\``);

    // Drop seo_metadata table
    await queryRunner.query(`DROP TABLE \`seo_metadata\``);
  }
}
