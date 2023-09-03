import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CreateUserDto } from './dto/create-user.dto';
import { GetPagination } from '@/utils/validators/pagination.validate';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: DeepMocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: createMock<UsersService>(),
        },
      ],
    }).compile();

    usersController = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(usersController).toBeDefined();
  });

  it('should calls usersService.create() method with CreateUserDto object', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@test.com',
      firstname: 'Test',
    };
    usersController.createUser(createUserDto);
    expect(usersService.create).toBeCalledWith(createUserDto);
  });

  it('should calls a usersService.findOne() with provided id', () => {
    const userId = '1';
    usersController.getOneUser(userId);
    expect(usersService.findOne).toBeCalledWith({ id: userId });
  });

  it('should calls a usersService.findManyWithPagination() method with provided page and size', () => {
    const paginationQuery: GetPagination = {
      page: 1,
      size: 5,
    };
    usersController.getAllUsers(paginationQuery);
    expect(usersService.findManyWithPagination).toBeCalledWith(paginationQuery);
  });

  it('should calls a usersService.updateUser() method with provided id and payload object', () => {
    const userId = '1';
    const payload: Partial<User> = {
      firstname: 'Test',
    };
    usersController.updateUser(userId, payload);
    expect(usersService.update).toBeCalledWith(userId, payload);
  });

  it('should calls a usersService.softDelete() method with provided id', () => {
    const userId = '1';
    usersController.deleteUser(userId);
    expect(usersService.softDelete).toBeCalledWith(userId);
  });
});
