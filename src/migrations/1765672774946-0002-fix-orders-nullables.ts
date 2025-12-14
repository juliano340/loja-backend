import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOrdersNullables1765672774946 implements MigrationInterface {
  name = 'FixOrdersNullables1765672774946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) BACKFILL: garantir que não existam NULLs antes de travar NOT NULL
    await queryRunner.query(
      `UPDATE "orders" SET "subtotal" = 0 WHERE "subtotal" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "orders" SET "shippingFee" = 0 WHERE "shippingFee" IS NULL`,
    );

    // Se existir algum total nulo por dados antigos (raro, mas segurança)
    await queryRunner.query(`
      UPDATE "orders"
      SET "total" = COALESCE("subtotal", 0) + COALESCE("shippingFee", 0)
      WHERE "total" IS NULL
    `);

    // Itens antigos: se productName estiver nulo e você quiser travar NOT NULL, preencha
    await queryRunner.query(`
      UPDATE "order_items"
      SET "productName" = 'Produto'
      WHERE "productName" IS NULL
    `);

    // 2) TRAVAR REGRAS (NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shippingFee" SET NOT NULL`,
    );

    // opcional (cinto de segurança): defaults
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" SET DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shippingFee" SET DEFAULT 0`,
    );

    // Se você quiser também travar productName no item:
    // await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "productName" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte defaults (opcional) e NOT NULL
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shippingFee" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shippingFee" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" DROP NOT NULL`,
    );

    // Se você travar productName no up, aqui você faria DROP NOT NULL também
    // await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "productName" DROP NOT NULL`);
  }
}
