import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserPassword1634567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER USER 'root'@'%' IDENTIFIED BY '${process.env.DATABASE_PASSWORD}';`
    );
    await queryRunner.query(
      `ALTER USER 'root'@'localhost' IDENTIFIED BY '${process.env.DATABASE_PASSWORD}';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ви можете залишити це порожнім або додати логіку для відкату змін
  }
}
