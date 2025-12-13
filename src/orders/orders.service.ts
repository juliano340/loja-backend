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

@Injectable()
export class OrdersService {
  constructor(
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
      // trava linhas de produto para evitar corrida de estoque
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds), isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException(
          'Um ou mais produtos não existem ou estão inativos.',
        );
      }

      // mapa rápido
      const map = new Map(products.map((p) => [p.id, p]));

      // valida estoque + monta itens
      const items: OrderItem[] = [];
      let total = 0;

      for (const i of dto.items) {
        const product = map.get(i.productId)!;

        if (product.stock < i.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para: ${product.name}`,
          );
        }

        const unitPriceNumber = Number(product.price);
        total += unitPriceNumber * i.quantity;

        const item = queryRunner.manager.create(OrderItem, {
          product,
          quantity: i.quantity,
          unitPrice: product.price,
          productName: product.name,
        });
        items.push(item);

        // baixa estoque
        product.stock -= i.quantity;
        await queryRunner.manager.save(product);
      }

      const order = queryRunner.manager.create(Order, {
        user,
        items,
        total: total.toFixed(2),
        status: OrderStatus.PENDING,
        shippingAddress: dto.shippingAddress,
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
}
