import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataRelations1765731936028 implements MigrationInterface {
    name = 'AddMetadataRelations1765731936028'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` DROP FOREIGN KEY \`FK_b2317083d32ad573f4786a68718\``);
        await queryRunner.query(`CREATE TABLE \`metadata\` (\`id\` varchar(36) NOT NULL, \`metaTitle\` varchar(255) NULL, \`metaDescription\` text NULL, \`metaKeywords\` text NULL, \`ogTitle\` varchar(255) NULL, \`ogDescription\` text NULL, \`ogImage\` varchar(500) NULL, \`ogType\` varchar(100) NULL, \`twitterTitle\` varchar(255) NULL, \`twitterDescription\` text NULL, \`twitterImage\` varchar(500) NULL, \`twitterCard\` varchar(50) NULL, \`canonicalUrl\` varchar(500) NULL, \`indexable\` tinyint NOT NULL DEFAULT 1, \`followable\` tinyint NOT NULL DEFAULT 1, \`structuredData\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD \`metadataId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD \`metadataId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`topics\` ADD \`metadataId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`metadataId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_392a5c50017d5b2ddf9a88011a5\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_cc2cdd2f73014b8138c0a93eec3\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_ddd0fe10f122898b7dea5ceffa3\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_2a76398eb8b605fa26a5bfcefe5\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` ADD CONSTRAINT \`FK_b2317083d32ad573f4786a68718\` FOREIGN KEY (\`categoriesId\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` DROP FOREIGN KEY \`FK_b2317083d32ad573f4786a68718\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_2a76398eb8b605fa26a5bfcefe5\``);
        await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_ddd0fe10f122898b7dea5ceffa3\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_cc2cdd2f73014b8138c0a93eec3\``);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_392a5c50017d5b2ddf9a88011a5\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`metadataId\``);
        await queryRunner.query(`ALTER TABLE \`topics\` DROP COLUMN \`metadataId\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`metadataId\``);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`metadataId\``);
        await queryRunner.query(`DROP TABLE \`metadata\``);
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` ADD CONSTRAINT \`FK_b2317083d32ad573f4786a68718\` FOREIGN KEY (\`categoriesId\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
