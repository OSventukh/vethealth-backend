import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetadataModule1734270000000 implements MigrationInterface {
  name = 'CreateMetadataModule1734270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create metadata table directly (no SEO intermediate step)
    await queryRunner.query(`
      CREATE TABLE \`metadata\` (
        \`id\` varchar(36) NOT NULL,
        \`metaTitle\` varchar(255) NULL,
        \`metaDescription\` text NULL,
        \`metaKeywords\` text NULL,
        \`ogTitle\` varchar(255) NULL,
        \`ogDescription\` text NULL,
        \`ogImageId\` varchar(36) NULL,
        \`ogImageAlt\` varchar(255) NULL,
        \`ogType\` varchar(100) NULL DEFAULT 'website',
        \`ogUrl\` varchar(500) NULL,
        \`ogSiteName\` varchar(255) NULL,
        \`twitterTitle\` varchar(255) NULL,
        \`twitterDescription\` text NULL,
        \`twitterImageId\` varchar(36) NULL,
        \`twitterImageAlt\` varchar(255) NULL,
        \`twitterCard\` varchar(100) NULL DEFAULT 'summary_large_image',
        \`twitterSite\` varchar(255) NULL,
        \`twitterCreator\` varchar(255) NULL,
        \`structuredData\` json NULL,
        \`canonicalUrl\` varchar(500) NULL,
        \`noIndex\` tinyint NOT NULL DEFAULT 0,
        \`noFollow\` tinyint NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Add metadata_id columns to related tables
    await queryRunner.query(`ALTER TABLE \`topics\` ADD \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD \`metadata_id\` varchar(36) NULL`);

    // Create unique indexes
    await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_metadata_topics\` ON \`topics\` (\`metadata_id\`)`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_metadata_posts\` ON \`posts\` (\`metadata_id\`)`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_metadata_categories\` ON \`categories\` (\`metadata_id\`)`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_metadata_pages\` ON \`pages\` (\`metadata_id\`)`);

    // Create foreign key constraints for metadata
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);

    // Create foreign key constraints for file relationships
    await queryRunner.query(`ALTER TABLE \`metadata\` ADD CONSTRAINT \`FK_metadata_ogImage\` FOREIGN KEY (\`ogImageId\`) REFERENCES \`file\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`metadata\` ADD CONSTRAINT \`FK_metadata_twitterImage\` FOREIGN KEY (\`twitterImageId\`) REFERENCES \`file\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(`ALTER TABLE \`metadata\` DROP FOREIGN KEY \`FK_metadata_twitterImage\``);
    await queryRunner.query(`ALTER TABLE \`metadata\` DROP FOREIGN KEY \`FK_metadata_ogImage\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_metadata\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_metadata\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_metadata\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_metadata\``);

    // Remove indexes
    await queryRunner.query(`DROP INDEX \`IDX_metadata_pages\` ON \`pages\``);
    await queryRunner.query(`DROP INDEX \`IDX_metadata_categories\` ON \`categories\``);
    await queryRunner.query(`DROP INDEX \`IDX_metadata_posts\` ON \`posts\``);
    await queryRunner.query(`DROP INDEX \`IDX_metadata_topics\` ON \`topics\``);

    // Remove metadata_id columns
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`metadata_id\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`metadata_id\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`metadata_id\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP COLUMN \`metadata_id\``);

    // Drop metadata table
    await queryRunner.query(`DROP TABLE \`metadata\``);
  }
}
