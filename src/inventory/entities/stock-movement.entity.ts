import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST';
export type StockMovementSource = 'admin' | 'sale' | 'system' | 'import';

@Entity('stock_movements')
@Index(['productId', 'createdAt'])
@Index(['referenceId'])
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 10 })
  type: StockMovementType;

  @Column({ type: 'varchar', length: 20 })
  source: StockMovementSource;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'previous_quantity', type: 'int' })
  previousQuantity: number;

  @Column({ name: 'new_quantity', type: 'int' })
  newQuantity: number;

  @Column({
    name: 'reference_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  referenceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
