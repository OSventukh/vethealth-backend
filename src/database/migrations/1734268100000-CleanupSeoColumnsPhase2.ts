import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupSeoColumnsPhase2_1734268100000 implements MigrationInterface {
  name = 'CleanupSeoColumnsPhase2_1734268100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Phase 2: Remove old columns and rename table (run this after new code is deployed)
    
    // Remove the old foreign key constraints
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_seo\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_seo\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_seo\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_seo\``);
    
    // Remove old unique constraints
    await queryRunner.query(`ALTER TABLE \`topics\` DROP INDEX \`IDX_seo_topics\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP INDEX \`IDX_seo_posts\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP INDEX \`IDX_seo_categories\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP INDEX \`IDX_seo_pages\``);
    
    // Remove old seo_id columns
    await queryRunner.query(`ALTER TABLE \`topics\` DROP COLUMN \`seo_id\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`seo_id\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`seo_id\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`seo_id\``);
    
    // Drop the view
    await queryRunner.query(`DROP VIEW \`metadata\``);
    
    // Rename the table
    await queryRunner.query(`RENAME TABLE \`seo_metadata\` TO \`metadata\``);
    
    // Update foreign key constraints to point to the renamed table
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_metadata\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_metadata\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_metadata\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_metadata\``);
    
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_metadata\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_metadata\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_metadata\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_metadata\``);
    
    // Rename table back
    await queryRunner.query(`RENAME TABLE \`metadata\` TO \`seo_metadata\``);
    
    // Recreate the view
    await queryRunner.query(`CREATE VIEW \`metadata\` AS SELECT * FROM \`seo_metadata\``);
    
    // Add back the old columns
    await queryRunner.query(`ALTER TABLE \`topics\` ADD \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD \`seo_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD \`seo_id\` varchar(36) NULL`);
    
    // Copy data back
    await queryRunner.query(`UPDATE \`topics\` SET \`seo_id\` = \`metadata_id\` WHERE \`metadata_id\` IS NOT NULL`);
    await queryRunner.query(`UPDATE \`posts\` SET \`seo_id\` = \`metadata_id\` WHERE \`metadata_id\` IS NOT NULL`);
    await queryRunner.query(`UPDATE \`categories\` SET \`seo_id\` = \`metadata_id\` WHERE \`metadata_id\` IS NOT NULL`);
    await queryRunner.query(`UPDATE \`pages\` SET \`seo_id\` = \`metadata_id\` WHERE \`metadata_id\` IS NOT NULL`);
    
    // Recreate old constraints
    await queryRunner.query(`ALTER TABLE \`topics\` ADD UNIQUE INDEX \`IDX_seo_topics\` (\`seo_id\`)`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD UNIQUE INDEX \`IDX_seo_posts\` (\`seo_id\`)`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD UNIQUE INDEX \`IDX_seo_categories\` (\`seo_id\`)`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD UNIQUE INDEX \`IDX_seo_pages\` (\`seo_id\`)`);
    
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_seo\` FOREIGN KEY (\`seo_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    
    // Update foreign key constraints to point back to seo_metadata
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_metadata\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_metadata\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_metadata\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_metadata\``);
    
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
  }
}
