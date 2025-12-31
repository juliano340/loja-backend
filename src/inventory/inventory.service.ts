// src/inventory/inventory.service.ts

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
  quantity: number; // IN/OUT: positivo | ADJUST: delta (+/-)
  type: StockMovementType; // 'IN' | 'OUT' | 'ADJUST'
  source: StockMovementSource; // 'admin' | 'sale' | 'system' | 'import'
  referenceId?: string | null;
  note?: string | null;
};

@Injectable()
export class InventoryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Quantidade disponível atual (se não existir inventory_item, considera 0)
   */
  async getAvailableQuantity(productId: number): Promise<number> {
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new BadRequestException('productId inválido');
    }

    const repo = this.dataSource.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { productId } });
    return item?.quantity ?? 0;
  }

  /**
   * Lista movimentos de estoque (audit trail)
   */
  async getMovements(productId: number, take = 50): Promise<StockMovement[]> {
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new BadRequestException('productId inválido');
    }

    const repo = this.dataSource.getRepository(StockMovement);
    return repo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  /**
   * Garante que existe inventory_item para o produto (dentro do manager da transação)
   */
  private async getOrCreateItem(
    productId: number,
    manager: any,
  ): Promise<InventoryItem> {
    // 1) valida existência do produto antes (evita erro feio de FK)
    const exists = await manager.query(
      `SELECT 1 FROM products WHERE id = $1 LIMIT 1`,
      [productId],
    );

    if (!exists || exists.length === 0) {
      throw new BadRequestException(`Produto ${productId} não existe`);
      // se preferir semanticamente:
      // throw new NotFoundException(`Produto ${productId} não existe`);
    }

    // 2) agora sim cria/pega inventory_item
    const invRepo = manager.getRepository(InventoryItem);

    let item = await invRepo.findOne({ where: { productId } });
    if (!item) {
      item = invRepo.create({ productId, quantity: 0 });
      item = await invRepo.save(item);
    }
    return item;
  }

  /**
   * Carrega o item com lock pessimista (evita corrida em OUT/ADJUST)
   */
  private async lockItem(itemId: number, manager: any): Promise<InventoryItem> {
    const invRepo = manager.getRepository(InventoryItem);

    const locked = await invRepo
      .createQueryBuilder('inv')
      .setLock('pessimistic_write')
      .where('inv.id = :id', { id: itemId })
      .getOne();

    if (!locked) {
      throw new BadRequestException('Inventory item não encontrado');
    }
    return locked;
  }

  /**
   * Ponto ÚNICO de alteração do estoque.
   * Sempre: transação + lock + grava movimento.
   */
  async changeStock(
    params: ChangeStockParams,
  ): Promise<{ newQuantity: number }> {
    const {
      productId,
      quantity,
      type,
      source,
      referenceId = null,
      note = null,
    } = params;

    // validações
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new BadRequestException('productId inválido');
    }

    if (!Number.isInteger(quantity) || quantity === 0) {
      throw new BadRequestException(
        'quantity deve ser inteiro e diferente de 0',
      );
    }

    // IN/OUT exigem positivo
    if ((type === 'IN' || type === 'OUT') && quantity < 0) {
      throw new BadRequestException('quantity deve ser positivo para IN/OUT');
    }

    // ADJUST pode ser delta (+/-), mas não 0 (já validado)
    if (type === 'ADJUST' && !Number.isInteger(quantity)) {
      throw new BadRequestException('quantity inválido para ADJUST');
    }

    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(InventoryItem);
      const movRepo = manager.getRepository(StockMovement);

      // 1) garante que exista item
      const item = await this.getOrCreateItem(productId, manager);

      // 2) lock pessimista no item
      const locked = await this.lockItem(item.id, manager);

      const previous = locked.quantity;

      // 3) calcula novo saldo
      let next = previous;

      if (type === 'IN') next = previous + quantity;
      if (type === 'OUT') next = previous - quantity;
      if (type === 'ADJUST') next = previous + quantity; // delta

      if (next < 0) {
        throw new BadRequestException('Estoque insuficiente');
      }

      // 4) salva saldo
      locked.quantity = next;
      await invRepo.save(locked);

      // 5) registra movimento
      const movement = movRepo.create({
        productId,
        type,
        source,
        quantity,
        previousQuantity: previous,
        newQuantity: next,
        referenceId,
        note,
      });

      await movRepo.save(movement);

      return { newQuantity: next };
    });
  }

  // =========================================================
  // HELPERS (atalhos semânticos)
  // =========================================================

  addStock(
    productId: number,
    qty: number,
    source: StockMovementSource,
    referenceId?: string | null,
    note?: string | null,
  ) {
    return this.changeStock({
      productId,
      quantity: qty,
      type: 'IN',
      source,
      referenceId,
      note,
    });
  }

  removeStock(
    productId: number,
    qty: number,
    source: StockMovementSource,
    referenceId?: string | null,
    note?: string | null,
  ) {
    return this.changeStock({
      productId,
      quantity: qty,
      type: 'OUT',
      source,
      referenceId,
      note,
    });
  }

  adjustStockDelta(
    productId: number,
    delta: number,
    source: StockMovementSource,
    referenceId?: string | null,
    note?: string | null,
  ) {
    return this.changeStock({
      productId,
      quantity: delta,
      type: 'ADJUST',
      source,
      referenceId,
      note,
    });
  }
}
