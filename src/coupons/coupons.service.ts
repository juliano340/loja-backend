import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Coupon, CouponType } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

type ApplyCouponResult = {
  coupon: Coupon;
  discountAmount: string; // numeric as string
};

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private readonly couponsRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly usagesRepo: Repository<CouponUsage>,
  ) {}

  // ---------- Admin CRUD ----------
  async create(dto: CreateCouponDto) {
    const code = this.normalizeCode(dto.code);

    const exists = await this.couponsRepo.findOne({ where: { code } });
    if (exists)
      throw new BadRequestException('Já existe um cupom com esse código.');

    const coupon = this.couponsRepo.create({
      ...dto,
      code,
      isActive: dto.isActive ?? true,
    });

    return this.couponsRepo.save(coupon);
  }

  findAll() {
    return this.couponsRepo.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const coupon = await this.couponsRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Cupom não encontrado.');
    return coupon;
  }

  async update(id: number, dto: UpdateCouponDto) {
    const coupon = await this.findOne(id);

    if (dto.code) dto.code = this.normalizeCode(dto.code);

    Object.assign(coupon, dto);
    return this.couponsRepo.save(coupon);
  }

  async remove(id: number) {
    const coupon = await this.findOne(id);
    await this.couponsRepo.remove(coupon);
    return { ok: true };
  }

  // ---------- Regras de cupom ----------
  async applyCoupon(params: {
    userId: number;
    couponCode: string;
    subtotal: string; // numeric string
  }): Promise<ApplyCouponResult> {
    const code = this.normalizeCode(params.couponCode);

    const coupon = await this.couponsRepo.findOne({ where: { code } });
    if (!coupon) throw new BadRequestException('Cupom inválido.');

    // ativo
    if (!coupon.isActive) throw new BadRequestException('Cupom inativo.');

    // janela de validade (se existir)
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Cupom ainda não está válido.');
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new BadRequestException('Cupom expirado.');
    }

    // subtotal mínimo (se existir)
    if (
      coupon.minSubtotal &&
      this.toCents(params.subtotal) < this.toCents(coupon.minSubtotal)
    ) {
      throw new BadRequestException(
        'Subtotal mínimo não atingido para usar este cupom.',
      );
    }

    // limites (total e por usuário) - aqui validamos já no PENDING,
    // e validamos de novo no PAID para evitar corrida.
    await this.assertLimits(coupon.id, params.userId, coupon);

    const discountAmount = this.computeDiscount(params.subtotal, coupon);

    return { coupon, discountAmount };
  }

  // Consumir cupom quando o pedido virar PAID
  async consumeOnPaid(params: {
    couponId: number;
    userId: number;
    orderId: number;
  }) {
    const coupon = await this.couponsRepo.findOne({
      where: { id: params.couponId },
    });
    if (!coupon) throw new BadRequestException('Cupom não encontrado.');

    // revalidar limites no momento do PAID (anti-corrida)
    await this.assertLimits(coupon.id, params.userId, coupon);

    const usage = this.usagesRepo.create({
      couponId: params.couponId,
      userId: params.userId,
      orderId: params.orderId,
    });

    await this.usagesRepo.save(usage);
  }

  private async assertLimits(couponId: number, userId: number, coupon: Coupon) {
    if (coupon.maxRedemptions) {
      const totalUses = await this.usagesRepo.count({ where: { couponId } });
      if (totalUses >= coupon.maxRedemptions) {
        throw new BadRequestException('Cupom esgotado.');
      }
    }

    if (coupon.maxRedemptionsPerUser) {
      const userUses = await this.usagesRepo.count({
        where: { couponId, userId },
      });
      if (userUses >= coupon.maxRedemptionsPerUser) {
        throw new BadRequestException('Você já utilizou este cupom.');
      }
    }
  }

  private computeDiscount(subtotal: string, coupon: Coupon): string {
    const subtotalCents = this.toCents(subtotal);

    let discountCents = 0;

    if (coupon.type === CouponType.FIXED) {
      discountCents = this.toCents(coupon.value);
    } else {
      // percentual: value = "10.00" => 10%
      const percent = Number(coupon.value);
      discountCents = Math.floor((subtotalCents * percent) / 100);
      if (coupon.maxDiscount) {
        discountCents = Math.min(
          discountCents,
          this.toCents(coupon.maxDiscount),
        );
      }
    }

    // nunca pode exceder subtotal
    discountCents = Math.min(discountCents, subtotalCents);

    return this.fromCents(discountCents);
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private toCents(value: string): number {
    // converte "12.34" => 1234
    const n = Number(value);
    if (Number.isNaN(n)) throw new BadRequestException('Valor inválido.');
    return Math.round(n * 100);
  }

  private fromCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  async consumeOnPaidWithManager(params: {
    manager: EntityManager;
    userId: number;
    orderId: number;
    couponCode: string;
  }) {
    const { manager, userId, orderId } = params;
    const code = params.couponCode.trim().toUpperCase();

    const coupon = await manager.findOne(Coupon, { where: { code } });
    if (!coupon) throw new BadRequestException('Cupom não encontrado.');

    // idempotência: evita duplicar uso se chamar PAID duas vezes
    const already = await manager.findOne(CouponUsage, { where: { orderId } });
    if (already) return;

    // limites
    if (coupon.maxRedemptions) {
      const totalUses = await manager.count(CouponUsage, {
        where: { couponId: coupon.id },
      });
      if (totalUses >= coupon.maxRedemptions)
        throw new BadRequestException('Cupom esgotado.');
    }

    if (coupon.maxRedemptionsPerUser) {
      const userUses = await manager.count(CouponUsage, {
        where: { couponId: coupon.id, userId },
      });
      if (userUses >= coupon.maxRedemptionsPerUser) {
        throw new BadRequestException('Você já utilizou este cupom.');
      }
    }

    const usage = manager.create(CouponUsage, {
      couponId: coupon.id,
      userId,
      orderId,
    });

    await manager.save(usage);
  }
}
