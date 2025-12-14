import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1765721119679 implements MigrationInterface {
    name = 'InitialSchema1765721119679'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "coupon_usages" (
                "id" SERIAL NOT NULL,
                "couponId" integer NOT NULL,
                "userId" integer NOT NULL,
                "orderId" integer,
                "usedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_01ff9a1cac559c4ae2e4179d0a3" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_803698570aee440e55af7d6a54" ON "coupon_usages" ("couponId", "userId")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."coupons_type_enum" AS ENUM('PERCENT', 'FIXED')
        `);
        await queryRunner.query(`
            CREATE TABLE "coupons" (
                "id" SERIAL NOT NULL,
                "code" character varying(50) NOT NULL,
                "type" "public"."coupons_type_enum" NOT NULL,
                "value" numeric(12, 2) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "startsAt" TIMESTAMP WITH TIME ZONE,
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                "maxRedemptions" integer,
                "maxRedemptionsPerUser" integer,
                "minSubtotal" numeric(12, 2),
                "maxDiscount" numeric(12, 2),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e025109230e82925843f2a14c4" ON "coupons" ("code")
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "couponCode" character varying(50)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "discountType" character varying(10)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "discountValue" numeric(12, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "discountAmount" numeric(12, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "subtotal" TYPE numeric(12, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "shippingFee" TYPE numeric(12, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "coupon_usages"
            ADD CONSTRAINT "FK_a7b422cc0dbf863671255eaad57" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "coupon_usages"
            ADD CONSTRAINT "FK_f526503f2419217d16794648f29" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "coupon_usages"
            ADD CONSTRAINT "FK_131640403c2fdd7a65ab7218873" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "coupon_usages" DROP CONSTRAINT "FK_131640403c2fdd7a65ab7218873"
        `);
        await queryRunner.query(`
            ALTER TABLE "coupon_usages" DROP CONSTRAINT "FK_f526503f2419217d16794648f29"
        `);
        await queryRunner.query(`
            ALTER TABLE "coupon_usages" DROP CONSTRAINT "FK_a7b422cc0dbf863671255eaad57"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "shippingFee" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "subtotal" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "discountAmount"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "discountValue"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "discountType"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "couponCode"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e025109230e82925843f2a14c4"
        `);
        await queryRunner.query(`
            DROP TABLE "coupons"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."coupons_type_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_803698570aee440e55af7d6a54"
        `);
        await queryRunner.query(`
            DROP TABLE "coupon_usages"
        `);
    }

}
