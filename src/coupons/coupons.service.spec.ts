import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CouponUsage } from './entities/coupon-usage.entity';
import { Coupon } from './entities/coupon.entity';
import { CouponsService } from './coupons.service';

describe('CouponsService', () => {
  let service: CouponsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(Coupon), useValue: {} },
        { provide: getRepositoryToken(CouponUsage), useValue: {} },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
