import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { PreviewCouponDto } from './dto/preview-coupon.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ---------------------------
  // ✅ Preview (usuário logado)
  // ---------------------------
  @UseGuards(AuthGuard('jwt'))
  @Post('preview')
  preview(@Req() req: any, @Body() dto: PreviewCouponDto) {
    // tenta cobrir os formatos mais comuns do payload JWT
    const userId = Number(
      req?.user?.sub ?? req?.user?.id ?? req?.user?.userId ?? NaN,
    );

    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Usuário inválido.');
    }

    return this.couponsService.applyCoupon({
      userId,
      couponCode: dto.couponCode,
      subtotal: dto.subtotal,
    });
  }

  // ---------------------------
  // ✅ Admin CRUD
  // ---------------------------
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(Number(id));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(Number(id), dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(Number(id));
  }
}
