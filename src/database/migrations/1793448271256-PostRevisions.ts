import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Історія змін постів: повний знімок (title/slug/content/SEO-мета/обкладинка/статус)
 * після кожного збереження. `featuredImageFileId` навмисно без FK — файл можуть
 * видалити з медіатеки, а ревізія має лишитись.
 */
export class PostRevisions1793448271256 implements MigrationInterface {
  name = "PostRevisions1793448271256";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `post_revisions` (`id` varchar(36) NOT NULL, `postId` varchar(36) NOT NULL, `title` varchar(255) NOT NULL, `slug` varchar(255) NOT NULL, `content` mediumtext NOT NULL, `metadata` json NULL, `featuredImageFileId` varchar(36) NULL, `featuredImageUrl` varchar(255) NULL, `status` varchar(50) NULL, `reason` varchar(20) NOT NULL, `restoredFromId` varchar(36) NULL, `editorId` varchar(36) NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_ac0c215a711286c7e7d1f5b913` (`postId`, `createdAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "ALTER TABLE `post_revisions` ADD CONSTRAINT `FK_cc490ce926c378f168ebbd78645` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `post_revisions` ADD CONSTRAINT `FK_2e307c360d06feaedeaa7343f6a` FOREIGN KEY (`editorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `post_revisions` DROP FOREIGN KEY `FK_2e307c360d06feaedeaa7343f6a`",
    );
    await queryRunner.query(
      "ALTER TABLE `post_revisions` DROP FOREIGN KEY `FK_cc490ce926c378f168ebbd78645`",
    );
    await queryRunner.query("DROP TABLE `post_revisions`");
  }
}
