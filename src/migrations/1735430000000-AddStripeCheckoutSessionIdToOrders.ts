import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeCheckoutSessionIdToOrders1735430000000 implements MigrationInterface {
  name = 'AddStripeCheckoutSessionIdToOrders1735430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "stripeCheckoutSessionId"
    `);
  }
}
