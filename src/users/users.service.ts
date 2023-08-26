import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationOptions } from 'src/utils/types/pagination-options';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { PaginationType } from 'src/utils/types/pagination.type';

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

  findOne(fields: EntityCondition<User>): Promise<User | null> {
    return this.usersRepository.findOne({ where: fields });
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
