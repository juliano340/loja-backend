import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../users/entities/user.entity';
import { CouponsService } from 'src/coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const productIds = dto.items.map((i) => i.productId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds), isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException(
          'Um ou mais produtos não existem ou estão inativos.',
        );
      }

      const map = new Map(products.map((p) => [p.id, p]));

      const items: OrderItem[] = [];
      let subtotal = 0;

      for (const i of dto.items) {
        const product = map.get(i.productId)!;

        if (product.stock < i.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para: ${product.name}`,
          );
        }

        const unitPriceNumber = Number(product.price);
        subtotal += unitPriceNumber * i.quantity;

        const item = queryRunner.manager.create(OrderItem, {
          product,
          quantity: i.quantity,
          unitPrice: product.price,
          productName: product.name,
        });
        items.push(item);

        product.stock -= i.quantity;
        await queryRunner.manager.save(product);
      }

      const shippingFee = this.calculateShippingFee(
        subtotal,
        dto.shippingAddress,
      );

      let discountAmount = 0;
      let couponSnapshot: {
        couponCode: string;
        discountType: string;
        discountValue: string;
        discountAmount: string;
      } | null = null;

      if (dto.couponCode) {
        const applied = await this.couponsService.applyCoupon({
          userId: user.id,
          couponCode: dto.couponCode,
          subtotal: subtotal.toFixed(2),
        });

        discountAmount = Number(applied.discountAmount);

        couponSnapshot = {
          couponCode: applied.coupon.code,
          discountType: applied.coupon.type,
          discountValue: applied.coupon.value,
          discountAmount: applied.discountAmount,
        };
      }

      const total = subtotal - discountAmount + shippingFee;

      const order = queryRunner.manager.create(Order, {
        user,
        items,
        subtotal: subtotal.toFixed(2),
        shippingFee: shippingFee.toFixed(2),
        total: total.toFixed(2),
        status: OrderStatus.PENDING,
        shippingAddress: dto.shippingAddress,

        couponCode: couponSnapshot?.couponCode ?? null,
        discountType: couponSnapshot?.discountType ?? null,
        discountValue: couponSnapshot?.discountValue ?? null,
        discountAmount: couponSnapshot?.discountAmount ?? null,
      });

      const saved = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return saved;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async findMyOrders(userId: number) {
    return this.ordersRepo.find({
      where: { user: { id: userId } },
      relations: {
        items: {
          product: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll() {
    return this.ordersRepo.find({
      relations: {
        user: true,
        items: { product: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(orderId: number, status: OrderStatus) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Pedido não encontrado');
      }

      this.validateStatusTransition(order.status, status);

      if (order.status === OrderStatus.CANCELLED) {
        await queryRunner.commitTransaction();
        return order;
      }

      if (status === OrderStatus.CANCELLED) {
        const items = await queryRunner.manager.find(OrderItem, {
          where: { order: { id: order.id } },
          relations: { product: true },
        });

        for (const item of items) {
          item.product.stock += item.quantity;
          await queryRunner.manager.save(item.product);
        }
      }

      if (status === OrderStatus.PAID) {
        order.paidAt = new Date();

        if (order.couponCode) {
          const resolvedUserId = Number(order.userId);

          if (!Number.isFinite(resolvedUserId)) {
            throw new BadRequestException(
              'Não foi possível identificar o usuário do pedido para consumir o cupom.',
            );
          }

          await this.couponsService.consumeOnPaidWithManager({
            manager: queryRunner.manager,
            userId: resolvedUserId,
            orderId: order.id,
            couponCode: order.couponCode,
          });
        }
      }

      if (status === OrderStatus.CANCELLED) {
        order.cancelledAt = new Date();
      }

      order.status = status;
      const saved = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus) {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(`Transição inválida: ${current} → ${next}`);
    }
  }

  private calculateShippingFee(
    subtotal: number,
    address?: { state: string },
  ): number {
    if (subtotal >= 200) return 0;
    if (!address) return 0;
    return address?.state === 'RS' ? 15 : 25;
  }
}
