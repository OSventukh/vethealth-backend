import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnDeleteCascade1766927492626 implements MigrationInterface {
    name = 'AddOnDeleteCascade1766927492626'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_392a5c50017d5b2ddf9a88011a5\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_cc2cdd2f73014b8138c0a93eec3\``);
        await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_ddd0fe10f122898b7dea5ceffa3\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_2a76398eb8b605fa26a5bfcefe5\``);
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` DROP FOREIGN KEY \`FK_b2317083d32ad573f4786a68718\``);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_392a5c50017d5b2ddf9a88011a5\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_cc2cdd2f73014b8138c0a93eec3\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_ddd0fe10f122898b7dea5ceffa3\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_2a76398eb8b605fa26a5bfcefe5\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` ADD CONSTRAINT \`FK_b2317083d32ad573f4786a68718\` FOREIGN KEY (\`categoriesId\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` DROP FOREIGN KEY \`FK_b2317083d32ad573f4786a68718\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_2a76398eb8b605fa26a5bfcefe5\``);
        await queryRunner.query(`ALTER TABLE \`topics\` DROP FOREIGN KEY \`FK_ddd0fe10f122898b7dea5ceffa3\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_cc2cdd2f73014b8138c0a93eec3\``);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_392a5c50017d5b2ddf9a88011a5\``);
        await queryRunner.query(`ALTER TABLE \`topic_category_relation\` ADD CONSTRAINT \`FK_b2317083d32ad573f4786a68718\` FOREIGN KEY (\`categoriesId\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_2a76398eb8b605fa26a5bfcefe5\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`topics\` ADD CONSTRAINT \`FK_ddd0fe10f122898b7dea5ceffa3\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_cc2cdd2f73014b8138c0a93eec3\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_392a5c50017d5b2ddf9a88011a5\` FOREIGN KEY (\`metadataId\`) REFERENCES \`metadata\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
