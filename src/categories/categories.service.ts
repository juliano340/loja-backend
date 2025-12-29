import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
  ) {}

  async findAll() {
    return this.categoriesRepo.find({
      order: { name: 'ASC' },
      select: ['id', 'name', 'slug', 'createdAt', 'updatedAt'],
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = (dto.slug?.trim() || this.slugify(dto.name)).toLowerCase();

    const exists = await this.categoriesRepo.exists({ where: { slug } });
    if (exists) {
      throw new BadRequestException('Já existe uma categoria com esse slug');
    }

    const category = this.categoriesRepo.create({
      name: dto.name.trim(),
      slug,
    });

    return this.categoriesRepo.save(category);
  }

  private slugify(input: string) {
    return input
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // remove símbolos
      .replace(/\s+/g, '-') // espaços -> hífen
      .replace(/-+/g, '-') // hífens repetidos
      .replace(/^-|-$/g, ''); // trim hífen
  }
}
