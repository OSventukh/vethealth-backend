import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSeoToMetadata1734268000000 implements MigrationInterface {
  name = 'RenameSeoToMetadata1734268000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the table from seo_metadata to metadata
    await queryRunner.query(`RENAME TABLE \`seo_metadata\` TO \`metadata\``);
    
    // Rename the foreign key columns from seo_id to metadata_id
    await queryRunner.query(`ALTER TABLE \`topics\` CHANGE \`seo_id\` \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`seo_id\` \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`categories\` CHANGE \`seo_id\` \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`pages\` CHANGE \`seo_id\` \`metadata_id\` varchar(36) NULL`);
    
    // Update foreign key constraint names
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_seo\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_seo\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_seo\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_seo\``);
    
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the foreign key constraints
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_metadata\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_metadata\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_metadata\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_metadata\``);
    
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_seo\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_seo\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_seo\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_seo\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    
    // Rename the columns back
    await queryRunner.query(`ALTER TABLE \`pages\` CHANGE \`metadata_id\` \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`categories\` CHANGE \`metadata_id\` \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`metadata_id\` \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`topics\` CHANGE \`metadata_id\` \`seo_id\` varchar(36) NULL`);
    
    // Rename the table back to seo_metadata
    await queryRunner.query(`RENAME TABLE \`metadata\` TO \`seo_metadata\``);
  }
}
