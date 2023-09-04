import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationOptions } from '@/utils/types/pagination-options';
import { EntityCondition } from '@/utils/types/entity-condition.type';
import { PaginationType } from '@/utils/types/pagination.type';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<User> {
    return this.usersRepository.save(
      this.usersRepository.create(createUserDto),
    );
  }

  async findOne(fields: EntityCondition<User>): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: fields });

    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  async findManyWithPagination(
    paginationOptions: PaginationOptions,
  ): Promise<PaginationType<User>> {
    const [items, count] = await this.usersRepository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.size,
      take: paginationOptions.size,
    });

    return {
      items,
      count,
      currentPage: paginationOptions.page,
      totalPages: Math.ceil(count / paginationOptions.size),
    };
  }

  update(id: User['id'], payload: DeepPartial<User>): Promise<User> {
    return this.usersRepository.save(
      this.usersRepository.create({
        id,
        ...payload,
      }),
    );
  }

  async softDelete(id: User['id']): Promise<void> {
    await this.usersRepository.softDelete(id);
  }
}
