import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(Number(id));
  }
}
