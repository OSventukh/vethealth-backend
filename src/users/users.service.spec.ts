import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
import { createMock } from '@golevelup/ts-jest';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { DeepPartial } from 'typeorm';
import { UserStatusEnum } from '@/statuses/user-statuses.enum';

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: Repository<UserEntity>;
  const USER_REPOSITORY_TOKEN = getRepositoryToken(UserEntity);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: createMock<Repository<UserEntity>>(),
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<UserEntity>>(USER_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  it('should call usersRepository.create() method with createUserDto object and default status', () => {
    const createUserDto: CreateUserDto = {
      firstname: 'Test',
    } as CreateUserDto;
    usersService.create({
      ...createUserDto,
    });
    expect(usersRepository.create).toBeCalledWith({
      ...createUserDto,
      status: {
        id: UserStatusEnum.Pending,
      },
    });
  });

  it('should call usersRepository.findOne() method with object that have where field and passed value', () => {
    usersService.findOne(UserEntity['id']);
    expect(usersRepository.findOne).toBeCalledWith({ where: UserEntity['id'] });
  });

  it('should call usersRepository.findAndCount() method with options', () => {
    const page = 1;
    const size = 5;
    const order = 'createdAt';
    const sort = 'ASC';

    usersService.findManyWithPagination({ page, size, sort, order });
    expect(usersRepository.findAndCount).toBeCalledWith({
      where: {
        firstname: undefined,
        lastname: undefined,
        role: {
          name: undefined,
        },
        status: {
          name: undefined,
        },
      },
      skip: (page - 1) * size,
      take: size,
      relations: {
        topics: undefined,
      },
      order: {
        [order]: sort,
      },
    });
  });

  it('should call usersRepository.save() and usersRepository.create() methods', () => {
    const user: UserEntity = {
      id: '1',
      firstname: 'Test',
    } as UserEntity;

    usersService.update(user.id, user.firstname as DeepPartial<UserEntity>);

    expect(usersRepository.save).toBeCalledWith(usersRepository.create(user));
  });

  it('should call usersRepository.softDelete() with provided id', () => {
    const userId = 'id';
    usersService.softDelete(userId);
    expect(usersRepository.softDelete).toBeCalledWith(userId);
  });
});
