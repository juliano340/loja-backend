import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1765672717809 implements MigrationInterface {
  name = 'Baseline1765672717809';

  public async up(queryRunner: QueryRunner): Promise<void> {}
  public async down(queryRunner: QueryRunner): Promise<void> {}
}
