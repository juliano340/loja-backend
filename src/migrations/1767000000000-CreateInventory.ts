import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventory1767000000000 implements MigrationInterface {
  name = 'CreateInventory1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" SERIAL NOT NULL,
        "product_id" integer NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_items_product_id" UNIQUE ("product_id"),
        CONSTRAINT "FK_inventory_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" SERIAL NOT NULL,
        "product_id" integer NOT NULL,
        "type" character varying(10) NOT NULL,
        "source" character varying(20) NOT NULL,
        "quantity" integer NOT NULL,
        "previous_quantity" integer NOT NULL,
        "new_quantity" integer NOT NULL,
        "reference_id" character varying(120),
        "note" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_movements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_movements_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_movements_product_created_at"
      ON "stock_movements" ("product_id", "created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_movements_reference_id"
      ON "stock_movements" ("reference_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_stock_movements_reference_id";`);
    await queryRunner.query(
      `DROP INDEX "IDX_stock_movements_product_created_at";`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements";`);
    await queryRunner.query(`DROP TABLE "inventory_items";`);
  }
}
