import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionHash1783273080941 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM `session`");
    await queryRunner.query(
      "ALTER TABLE `session` ADD `hash` varchar(255) NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `session` DROP COLUMN `hash`");
  }
}
