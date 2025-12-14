import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Column,
  Index,
} from 'typeorm';
import { Coupon } from './coupon.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('coupon_usages')
@Index(['coupon', 'user'])
export class CouponUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Coupon, (c) => c.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;

  @Column()
  couponId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Order | null;

  @Column({ nullable: true })
  orderId: number | null;

  @CreateDateColumn()
  usedAt: Date;
}
