import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { InventoryService } from '../inventory.service';
import { ChangeStockDto } from '../dto/change-stock.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';

import { Roles, ROLE } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(ROLE.ADMIN)
@Controller('admin/inventory')
export class InventoryAdminController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  getInventory(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.getAvailableQuantity(productId);
  }

  @Post(':productId/add')
  addStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: ChangeStockDto,
  ) {
    return this.inventoryService.addStock(
      productId,
      dto.quantity,
      'admin',
      dto.referenceId,
      dto.note,
    );
  }

  @Post(':productId/remove')
  removeStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: ChangeStockDto,
  ) {
    return this.inventoryService.removeStock(
      productId,
      dto.quantity,
      'admin',
      dto.referenceId,
      dto.note,
    );
  }

  @Post(':productId/adjust')
  adjustStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStockDelta(
      productId,
      dto.delta,
      'admin',
      dto.referenceId,
      dto.note,
    );
  }

  @Get(':productId/movements')
  getMovements(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.getMovements(productId);
  }
}
