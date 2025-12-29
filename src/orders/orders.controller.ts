import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  findMy(@Req() req: any) {
    return this.ordersService.findMyOrders(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(Number(id), dto.status);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    // se você usa req.user.id:
    const userId = req.user.id;
    return this.ordersService.findByIdForUser(userId, id);
  }
}
