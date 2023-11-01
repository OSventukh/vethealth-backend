import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
import { createMock } from '@golevelup/ts-jest';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { UserQueryDto } from './dto/user-query.dto';
import { userOrder } from './utils/user-order';

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

  it('should call usersRepository.create() method with createUserDto object', () => {
    const createUserDto: CreateUserDto = {
      firstname: 'Test',
    } as CreateUserDto;
    usersService.create({
      ...createUserDto,
    });
    expect(usersRepository.create).toBeCalledWith(createUserDto);
  });

  it('should call usersRepository.findOne() method with object that have where field and passed value', () => {
    usersService.findOne(UserEntity['id']);
    expect(usersRepository.findOne).toBeCalledWith({ where: UserEntity['id'] });
  });

  it('should call usersRepository.findAndCount() method with options', () => {
    const queryDto = new UserQueryDto();
    const {
      firstname,
      lastname,
      role,
      status,
      page,
      size,
      include,
      orderBy,
      sort,
    } = queryDto;
    usersService.findManyWithPagination(queryDto);
    expect(usersRepository.findAndCount).toBeCalledWith({
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
      relations: include,
      order: userOrder(orderBy, sort),
    });
  });

  it('should call usersRepository.save() and usersRepository.create() methods', () => {
    const user: UserEntity = {
      id: '1',
      firstname: 'Test',
    } as UserEntity;

    usersService.update(user);

    expect(usersRepository.save).toBeCalledWith(usersRepository.create(user));
  });

  it('should call usersRepository.softDelete() with provided id', () => {
    const userId = 'id';
    usersService.softDelete(userId);
    expect(usersRepository.softDelete).toBeCalledWith(userId);
  });
});
