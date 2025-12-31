import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryAdminController } from './controllers/inventory-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, StockMovement])],
  controllers: [InventoryAdminController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
