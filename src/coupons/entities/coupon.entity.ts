import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CouponUsage } from './coupon-usage.entity';

export enum CouponType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string; // ex: BEMVINDO10

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  // percent: 10 => 10% | fixed: 20 => R$20
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  value: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'int', nullable: true })
  maxRedemptions: number | null; // total

  @Column({ type: 'int', nullable: true })
  maxRedemptionsPerUser: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  minSubtotal: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  maxDiscount: string | null;

  @OneToMany(() => CouponUsage, (u) => u.coupon)
  usages: CouponUsage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
