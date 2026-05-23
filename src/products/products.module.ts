import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { ProductCategory } from './entities/product-category.entity';
import { Category } from 'src/categories/entities/category.entity';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductCategory, Category]),
    InventoryModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, RolesGuard],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
