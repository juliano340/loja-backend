import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Category } from '../categories/entities/category.entity';

type FindAllFilters = {
  categorySlug?: string;
  categoryId?: number;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductCategory)
    private readonly productCategoriesRepository: Repository<ProductCategory>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    // 1) valida categorias
    await this.assertCategoriesExist(createProductDto.categoryIds);

    // 2) cria produto
    const product = this.productsRepository.create({
      ...createProductDto,
      price: createProductDto.price.toFixed(2),
    });

    const saved = await this.productsRepository.save(product);

    // 3) cria vínculos (product_categories)
    await this.productCategoriesRepository.insert(
      createProductDto.categoryIds.map((categoryId) => ({
        productId: saved.id,
        categoryId,
      })),
    );

    // 4) retorna completo com categories
    return this.findOne(saved.id);
  }

  async findAll(filters: FindAllFilters = {}) {
    const qb = this.productsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.categoryLinks', 'pc')
      .leftJoinAndSelect('pc.category', 'c')
      .where('p.isActive = :isActive', { isActive: true })
      .orderBy('p.createdAt', 'DESC');

    if (filters.categoryId) {
      qb.andWhere('c.id = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.categorySlug) {
      qb.andWhere('c.slug = :slug', { slug: filters.categorySlug });
    }

    const products = await qb.getMany();
    return products.map((p) => this.toProductResponse(p));
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: {
        categoryLinks: { category: true },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return this.toProductResponse(product);
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // garante que existe
    await this.findOne(id); // já valida e já teria relations, mas aqui só validamos existência

    // price (se vier)
    if (updateProductDto.price !== undefined) {
      (updateProductDto as any).price = updateProductDto.price.toFixed(2);
    }

    // replace categories (se vier categoryIds)
    if (updateProductDto.categoryIds) {
      await this.assertCategoriesExist(updateProductDto.categoryIds);

      await this.productCategoriesRepository.delete({ productId: id });

      await this.productCategoriesRepository.insert(
        updateProductDto.categoryIds.map((categoryId) => ({
          productId: id,
          categoryId,
        })),
      );
    }

    // atualiza campos do produto (sem categoryIds)
    const { categoryIds, ...rest } = updateProductDto as any;

    await this.productsRepository.update({ id }, rest);

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    await this.productsRepository.remove(product);
  }

  private async assertCategoriesExist(categoryIds: string[]) {
    const uniqueIds = Array.from(new Set(categoryIds));

    const count = await this.categoriesRepository.count({
      where: { id: In(uniqueIds) },
    });

    if (count !== uniqueIds.length) {
      throw new BadRequestException('Uma ou mais categorias não existem');
    }
  }

  private toProductResponse(product: Product) {
    const categories = (product.categoryLinks ?? [])
      .map((pc) => pc.category)
      .filter(Boolean);

    const { categoryLinks, ...rest } = product as any;

    return {
      ...rest,
      categories,
    };
  }
}
