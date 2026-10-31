import { MigrationInterface, QueryRunner } from "typeorm";

export class MediaLibrary1792333705882 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `files` ADD `alt` varchar(500) NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `files` ADD `originalName` varchar(255) NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `files` ADD `mimeType` varchar(100) NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `files` ADD `size` int UNSIGNED NULL",
    );
    // Наявні рядки отримують час міграції — справжньої дати завантаження
    // для них немає.
    await queryRunner.query(
      "ALTER TABLE `files` ADD `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `files` DROP COLUMN `createdAt`");
    await queryRunner.query("ALTER TABLE `files` DROP COLUMN `size`");
    await queryRunner.query("ALTER TABLE `files` DROP COLUMN `mimeType`");
    await queryRunner.query(
      "ALTER TABLE `files` DROP COLUMN `originalName`",
    );
    await queryRunner.query("ALTER TABLE `files` DROP COLUMN `alt`");
  }
}
