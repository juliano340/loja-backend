import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Column,
} from 'typeorm';
import { Product } from './product.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('product_categories')
@Index(['productId', 'categoryId'], { unique: true })
export class ProductCategory {
  @PrimaryColumn({ type: 'int' })
  productId: number;

  @PrimaryColumn({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Product, (p) => p.categoryLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Category, (c) => c.productLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
