import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeLastEventIdToOrders1735431000000 implements MigrationInterface {
  name = 'AddStripeLastEventIdToOrders1735431000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "stripeLastEventId" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "stripeLastEventId"
    `);
  }
}
