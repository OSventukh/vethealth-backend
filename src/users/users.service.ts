import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { PaginationType } from '@/utils/types/pagination.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEntity } from './entities/user.entity';
import { UserStatusEnum } from '@/statuses/user-statuses.enum';
import { userOrder } from './utils/user-order';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersRepository.save(
      this.usersRepository.create({
        ...createUserDto,
        status: { id: UserStatusEnum.Pending },
      }),
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
    queryDto: UserQueryDto,
  ): Promise<PaginationType<UserEntity>> {
    const {
      firstname,
      lastname,
      role,
      status,
      orderBy,
      sort,
      include,
      page,
      size,
    } = queryDto;
    const [items, count] = await this.usersRepository.findAndCount({
      where: {
        firstname,
        lastname,
        role: {
          name: role,
        },
        status: {
          name: status,
        },
      },
      skip: (page - 1) * size,
      take: size,
      order: userOrder(orderBy, sort),
      relations: {
        topics: Boolean(include?.includes('topics')),
      },
    });

    return {
      items,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / size),
    };
  }

  async update(
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
