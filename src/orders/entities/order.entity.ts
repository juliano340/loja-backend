import { User } from '../../users/entities/user.entity';

import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: false, nullable: false })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  shippingFee: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  shippingAddress?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zip: string;
  };

  @Column({ nullable: true })
  paidAt?: Date;

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  couponCode?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  discountType: string | null; // 'PERCENT' | 'FIXED'

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  discountValue: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  discountAmount: string | null;

  @Column() userId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCheckoutSessionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeLastEventId?: string;
}
