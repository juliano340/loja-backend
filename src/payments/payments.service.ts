import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
    private ordersService: OrdersService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  private moneyToCents(value: string | null | undefined): number {
    const v = (value ?? '0').toString().replace(',', '.').trim();
    const [ints, decsRaw] = v.split('.');
    const decs = (decsRaw ?? '0').padEnd(2, '0').slice(0, 2);

    const sign = ints.startsWith('-') ? -1 : 1;
    const i = Math.abs(parseInt(ints || '0', 10));
    const d = parseInt(decs, 10);

    return sign * (i * 100 + d);
  }

  // (mantive, mesmo não usando agora — pode remover se quiser)
  private parsePercent(value: string | null | undefined): number {
    const n = Number(String(value ?? '0').replace(',', '.'));
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  async createCheckoutSession(userId: number, orderId: number) {
    const order = await this.ordersRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });

    if (!order) throw new BadRequestException('Pedido não encontrado.');
    if (order.userId !== userId)
      throw new ForbiddenException('Pedido não pertence ao usuário.');
    if (order.status !== OrderStatus.PENDING)
      throw new BadRequestException('Pedido não está pendente.');
    if (!order.items?.length)
      throw new BadRequestException('Pedido sem itens.');

    const currency = (process.env.CURRENCY || 'brl').toLowerCase();
    const successUrl = process.env.CHECKOUT_SUCCESS_URL!;
    const cancelUrl = process.env.CHECKOUT_CANCEL_URL!;

    const subtotalCents = this.moneyToCents(order.subtotal);
    const shippingCents = this.moneyToCents(order.shippingFee);
    const totalCents = this.moneyToCents(order.total ?? '0');

    if (totalCents <= 0)
      throw new BadRequestException('Total do pedido inválido.');

    // 1) line_items SEM desconto (preço original do snapshot)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      order.items.map((i) => {
        const name =
          i.productName ||
          i.product?.name ||
          `Produto #${i.product?.id ?? ''}`.trim();

        const unitAmount = this.moneyToCents(i.unitPrice);
        if (unitAmount <= 0)
          throw new BadRequestException(`Item com preço inválido: ${name}`);

        return {
          quantity: i.quantity,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: { name },
          },
        };
      });

    // Frete como item separado (ok)
    if (shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: shippingCents,
          product_data: { name: 'Frete' },
        },
      });
    }

    // 2) Detecta desconto do seu Order (cupom)
    const discountAmountCents = this.moneyToCents(order.discountAmount);
    const hasDiscount =
      !!order.discountType && discountAmountCents > 0 && !!order.couponCode;

    // 3) Validação de consistência (antes de criar session)
    const computedTotalNoDiscount = lineItems.reduce((acc, li) => {
      const unit = (li.price_data as any).unit_amount as number;
      return acc + unit * (li.quantity ?? 1);
    }, 0);

    const expectedNoDiscount = subtotalCents + shippingCents;

    if (expectedNoDiscount !== computedTotalNoDiscount) {
      throw new BadRequestException(
        `Subtotal/frete divergentes. expectedNoDiscount=${expectedNoDiscount} computed=${computedTotalNoDiscount} (centavos)`,
      );
    }

    if (hasDiscount) {
      const expectedWithDiscount = expectedNoDiscount - discountAmountCents;
      if (expectedWithDiscount !== totalCents) {
        throw new BadRequestException(
          `Total com desconto divergente. expectedWithDiscount=${expectedWithDiscount} orderTotal=${totalCents} (centavos)`,
        );
      }
    } else {
      if (expectedNoDiscount !== totalCents) {
        throw new BadRequestException(
          `Total divergente. expected=${expectedNoDiscount} orderTotal=${totalCents} (centavos)`,
        );
      }
    }

    // 4) Se tiver desconto, cria um Coupon na Stripe e aplica via discounts
    // Importante: usamos amount_off para bater com sua regra (não descontar frete)
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;

    if (hasDiscount) {
      const coupon = await this.stripe.coupons.create({
        duration: 'once',
        amount_off: discountAmountCents,
        currency,
        name: order.couponCode ?? undefined,
        metadata: {
          orderId: String(order.id),
          discountType: String(order.discountType ?? ''),
          discountValue: String(order.discountValue ?? ''),
        },
      });

      discounts = [{ coupon: coupon.id }];
    }

    // 5) cria a sessão Stripe Checkout
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      discounts,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        orderId: String(order.id),
        userId: String(order.userId),
      },
    });

    order.stripeCheckoutSessionId = session.id;
    await this.ordersRepo.save(order);

    return { url: session.url, sessionId: session.id };
  }

  async verifyStripeWebhook(
    rawBody: Buffer,
    signature: string | string[] | undefined,
  ) {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    if (!sig) throw new BadRequestException('Stripe-Signature ausente.');

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret)
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET não configurado.');

    const event = this.stripe.webhooks.constructEvent(rawBody, sig, secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // ✅ segurança mínima: só confirma se estiver pago
      if (session.payment_status && session.payment_status !== 'paid') {
        return { received: true, type: event.type };
      }

      const orderId = Number(session.metadata?.orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new BadRequestException('orderId ausente/ inválido na metadata.');
      }

      const order = await this.ordersRepo.findOne({ where: { id: orderId } });
      if (!order)
        throw new BadRequestException('Pedido não encontrado (webhook).');

      // ✅ idempotência: se já processou este evento, ignora
      if (order.stripeLastEventId === event.id) {
        return { received: true, type: event.type };
      }

      // segurança: confere se a session bate com o pedido
      if (
        order.stripeCheckoutSessionId &&
        order.stripeCheckoutSessionId !== session.id
      ) {
        throw new BadRequestException('SessionId não confere com o pedido.');
      }

      // Se já estiver pago, só carimba o evento e sai
      if (order.status === OrderStatus.PAID) {
        await this.ordersRepo.update(order.id, { stripeLastEventId: event.id });
        return { received: true, type: event.type };
      }

      // ✅ CORREÇÃO PRINCIPAL:
      // Em vez de atualizar o status aqui, delega para OrdersService.updateStatus,
      // que já consome cupom e popula a tabela de uso dentro de transação.
      await this.ordersService.updateStatus(order.id, OrderStatus.PAID);

      // Carimba idempotência após a transação do Order
      await this.ordersRepo.update(order.id, { stripeLastEventId: event.id });

      return { received: true, type: event.type };
    }

    return { received: true, type: event.type };
  }
}
