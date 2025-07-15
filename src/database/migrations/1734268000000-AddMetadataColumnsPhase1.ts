import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataColumnsPhase1_1734268000000 implements MigrationInterface {
  name = 'AddMetadataColumnsPhase1_1734268000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Phase 1: Add new columns alongside existing ones (backward compatible)
    
    // Add new metadata_id columns alongside existing seo_id columns
    await queryRunner.query(`ALTER TABLE \`topics\` ADD \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD \`metadata_id\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD \`metadata_id\` varchar(36) NULL`);
    
    // Create a view for backward compatibility that aliases the new table name
    await queryRunner.query(`CREATE VIEW \`metadata\` AS SELECT * FROM \`seo_metadata\``);
    
    // Copy existing seo_id values to metadata_id columns
    await queryRunner.query(`UPDATE \`topics\` SET \`metadata_id\` = \`seo_id\` WHERE \`seo_id\` IS NOT NULL`);
    await queryRunner.query(`UPDATE \`posts\` SET \`metadata_id\` = \`seo_id\` WHERE \`seo_id\` IS NOT NULL`);
    await queryRunner.query(`UPDATE \`categories\` SET \`metadata_id\` = \`seo_id\` WHERE \`seo_id\` IS NOT NULL`);
    await queryRunner.query(`UPDATE \`pages\` SET \`metadata_id\` = \`seo_id\` WHERE \`seo_id\` IS NOT NULL`);
    
    // Add foreign key constraints for new columns
    await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_topics_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_posts_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_categories_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_metadata\` FOREIGN KEY (\`metadata_id\`) REFERENCES \`seo_metadata\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    
    // Add unique constraints for new columns
    await queryRunner.query(`ALTER TABLE \`topics\` ADD UNIQUE INDEX \`IDX_topics_metadata\` (\`metadata_id\`)`);
    await queryRunner.query(`ALTER TABLE \`posts\` ADD UNIQUE INDEX \`IDX_posts_metadata\` (\`metadata_id\`)`);
    await queryRunner.query(`ALTER TABLE \`categories\` ADD UNIQUE INDEX \`IDX_categories_metadata\` (\`metadata_id\`)`);
    await queryRunner.query(`ALTER TABLE \`pages\` ADD UNIQUE INDEX \`IDX_pages_metadata\` (\`metadata_id\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the changes made in phase 1
    await queryRunner.query(`ALTER TABLE \`pages\` DROP INDEX \`IDX_pages_metadata\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP INDEX \`IDX_categories_metadata\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP INDEX \`IDX_posts_metadata\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP INDEX \`IDX_topics_metadata\``);
    
    await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_metadata\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_metadata\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_metadata\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_topics_metadata\``);
    
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`metadata_id\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`metadata_id\``);
    await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`metadata_id\``);
    await queryRunner.query(`ALTER TABLE \`topics\` DROP COLUMN \`metadata_id\``);
    
    await queryRunner.query(`DROP VIEW \`metadata\``);
  }
}
