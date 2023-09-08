import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationOptions } from '@/utils/types/pagination-options.type';
import { FindOptionsWhere } from 'typeorm';
import { PaginationType } from '@/utils/types/pagination.type';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersRepository.save(
      this.usersRepository.create(createUserDto),
    );
  }

  async findOne(
    fields: FindOptionsWhere<UserEntity>,
  ): Promise<UserEntity | null> {
    const user = await this.usersRepository.findOne({ where: fields });

    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  async findManyWithPagination(
    paginationOptions: PaginationOptions,
  ): Promise<PaginationType<UserEntity>> {
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

  update(
    id: UserEntity['id'],
    payload: DeepPartial<UserEntity>,
  ): Promise<UserEntity> {
    return this.usersRepository.save(
      this.usersRepository.create({
        id,
        ...payload,
      }),
    );
  }

  async softDelete(id: UserEntity['id']): Promise<void> {
    await this.usersRepository.softDelete(id);
  }
}
