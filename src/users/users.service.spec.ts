import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { createMock } from '@golevelup/ts-jest';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { DeepPartial } from 'typeorm';

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: Repository<User>;
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: createMock<Repository<User>>(),
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(USER_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  it('should call usersRepository.create() method with createUserDto object', () => {
    const createUserDto: CreateUserDto = {
      firstname: 'Test',
    } as CreateUserDto;
    usersService.create(createUserDto);
    expect(usersRepository.create).toBeCalledWith(createUserDto);
  });

  it('should call usersRepository.findOne() method with object that have where field and passed value', () => {
    usersService.findOne(User['id']);
    expect(usersRepository.findOne).toBeCalledWith({ where: User['id'] });
  });

  it('should call usersRepository.findAndCount() method with options', () => {
    const page = 1;
    const size = 5;
    usersService.findManyWithPagination({ page, size });
    expect(usersRepository.findAndCount).toBeCalledWith({
      skip: (page - 1) * size,
      take: size,
    });
  });

  it('should call usersRepository.save() and usersRepository.create() methods', () => {
    const user: User = {
      id: '1',
      firstname: 'Test',
    } as User;

    usersService.update(user.id, user.firstname as DeepPartial<User>);

    expect(usersRepository.save).toBeCalledWith(usersRepository.create(user));
  });

  it('should call usersRepository.softDelete() with provided id', () => {
    const userId = 'id';
    usersService.softDelete(userId);
    expect(usersRepository.softDelete).toBeCalledWith(userId);
  });
});
