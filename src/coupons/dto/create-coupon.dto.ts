import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponType } from '../entities/coupon.entity';

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsEnum(CouponType)
  type: CouponType;

  @IsString()
  value: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptionsPerUser?: number;

  @IsOptional()
  @IsString()
  minSubtotal?: string;

  @IsOptional()
  @IsString()
  maxDiscount?: string;
}
