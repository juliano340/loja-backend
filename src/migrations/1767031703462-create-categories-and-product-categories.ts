import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoriesAndProductCategories1767031703462 implements MigrationInterface {
    name = 'CreateCategoriesAndProductCategories1767031703462'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(120) NOT NULL,
                "slug" character varying(140) NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories" ("slug")
        `);
        await queryRunner.query(`
            CREATE TABLE "product_categories" (
                "productId" integer NOT NULL,
                "categoryId" uuid NOT NULL,
                CONSTRAINT "PK_e65c1adebf00d61f1c84a4f3950" PRIMARY KEY ("productId", "categoryId")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e65c1adebf00d61f1c84a4f395" ON "product_categories" ("productId", "categoryId")
        `);
        await queryRunner.query(`
            ALTER TABLE "product_categories"
            ADD CONSTRAINT "FK_6156a79599e274ee9d83b1de139" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "product_categories"
            ADD CONSTRAINT "FK_fdef3adba0c284fd103d0fd3697" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "product_categories" DROP CONSTRAINT "FK_fdef3adba0c284fd103d0fd3697"
        `);
        await queryRunner.query(`
            ALTER TABLE "product_categories" DROP CONSTRAINT "FK_6156a79599e274ee9d83b1de139"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e65c1adebf00d61f1c84a4f395"
        `);
        await queryRunner.query(`
            DROP TABLE "product_categories"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"
        `);
        await queryRunner.query(`
            DROP TABLE "categories"
        `);
    }

}
