import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find();
  }

  findOne(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const dataToUpdate: Partial<User> = { ...updateUserDto };

    if (updateUserDto.password) {
      const saltRounds = 10;
      dataToUpdate.password = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
    }

    await this.usersRepository.update(id, dataToUpdate);
    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (!user) {
      return null;
    }
    return this.usersRepository.remove(user);
  }
}
