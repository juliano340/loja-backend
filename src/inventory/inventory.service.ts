import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { InventoryItem } from './entities/inventory-item.entity';
import {
  StockMovement,
  StockMovementSource,
  StockMovementType,
} from './entities/stock-movement.entity';

type ChangeStockParams = {
  productId: number;
  quantity: number; // IN/OUT positivo | ADJUST delta (+/-)
  type: StockMovementType;
  source: StockMovementSource;
  referenceId?: string | null;
  note?: string | null;
};

@Injectable()
export class InventoryService {
  constructor(private readonly dataSource: DataSource) {}

  async getAvailableQuantity(productId: number): Promise<number> {
    const repo = this.dataSource.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { productId } });
    return item?.quantity ?? 0;
  }

  async getMovements(productId: number, take = 50): Promise<StockMovement[]> {
    const repo = this.dataSource.getRepository(StockMovement);
    return repo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  // ===============================
  // INTERNOS (usam manager)
  // ===============================

  private async getOrCreateItem(
    productId: number,
    manager: any,
  ): Promise<InventoryItem> {
    const exists = await manager.query(
      `SELECT 1 FROM products WHERE id = $1 LIMIT 1`,
      [productId],
    );

    if (!exists || exists.length === 0) {
      throw new BadRequestException(`Produto ${productId} não existe`);
    }

    const repo = manager.getRepository(InventoryItem);

    let item = await repo.findOne({ where: { productId } });
    if (!item) {
      item = repo.create({ productId, quantity: 0 });
      item = await repo.save(item);
    }

    return item;
  }

  private async lockItem(itemId: number, manager: any): Promise<InventoryItem> {
    const repo = manager.getRepository(InventoryItem);

    const locked = await repo
      .createQueryBuilder('inv')
      .setLock('pessimistic_write')
      .where('inv.id = :id', { id: itemId })
      .getOne();

    if (!locked) {
      throw new BadRequestException('Inventory item não encontrado');
    }

    return locked;
  }

  // ===============================
  // CORE (aceita manager externo)
  // ===============================

  async changeStock(
    params: ChangeStockParams,
    managerOverride?: any,
  ): Promise<{ newQuantity: number }> {
    const exec = async (manager: any) => {
      const invRepo = manager.getRepository(InventoryItem);
      const movRepo = manager.getRepository(StockMovement);

      const item = await this.getOrCreateItem(params.productId, manager);
      const locked = await this.lockItem(item.id, manager);

      const previous = locked.quantity;
      let next = previous;

      if (params.type === 'IN') next = previous + params.quantity;
      if (params.type === 'OUT') next = previous - params.quantity;
      if (params.type === 'ADJUST') next = previous + params.quantity;

      if (next < 0) {
        throw new BadRequestException('Estoque insuficiente');
      }

      locked.quantity = next;
      await invRepo.save(locked);

      const movement = movRepo.create({
        productId: params.productId,
        type: params.type,
        source: params.source,
        quantity: params.quantity,
        previousQuantity: previous,
        newQuantity: next,
        referenceId: params.referenceId ?? null,
        note: params.note ?? null,
      });

      await movRepo.save(movement);

      return { newQuantity: next };
    };

    if (managerOverride) {
      return exec(managerOverride);
    }

    return this.dataSource.transaction(exec);
  }

  // ===============================
  // HELPERS
  // ===============================

  addStock(
    productId: number,
    qty: number,
    source: StockMovementSource,
    referenceId?: string | null,
    note?: string | null,
    manager?: any,
  ) {
    return this.changeStock(
      { productId, quantity: qty, type: 'IN', source, referenceId, note },
      manager,
    );
  }

  removeStock(
    productId: number,
    qty: number,
    source: StockMovementSource,
    referenceId?: string | null,
    note?: string | null,
    manager?: any,
  ) {
    return this.changeStock(
      { productId, quantity: qty, type: 'OUT', source, referenceId, note },
      manager,
    );
  }

  adjustStockDelta(
    productId: number,
    delta: number,
    source: StockMovementSource,
    referenceId?: string | null,
    note?: string | null,
    manager?: any,
  ) {
    return this.changeStock(
      { productId, quantity: delta, type: 'ADJUST', source, referenceId, note },
      manager,
    );
  }
}
