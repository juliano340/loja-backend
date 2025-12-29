// src/payments/payments.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('checkout-session')
  async checkoutSession(
    @Req() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('Token inválido: userId ausente.');
    }

    return this.payments.createCheckoutSession(userId, dto.orderId);
  }

  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'];
    const result = await this.payments.verifyStripeWebhook(
      req.rawBody as Buffer,
      signature,
    );

    console.log('[stripe webhook]', result);

    return result;
  }
}
