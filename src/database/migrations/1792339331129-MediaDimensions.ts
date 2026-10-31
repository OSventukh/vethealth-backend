import { MigrationInterface, QueryRunner } from "typeorm";

export class MediaDimensions1792339331129 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `files` ADD `width` int UNSIGNED NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `files` ADD `height` int UNSIGNED NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `files` DROP COLUMN `height`");
    await queryRunner.query("ALTER TABLE `files` DROP COLUMN `width`");
  }
}
