import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuToProducts1748048092000 implements MigrationInterface {
  name = 'AddSkuToProducts1748048092000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "sku" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sku"`);
  }
}
