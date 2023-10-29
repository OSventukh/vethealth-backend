import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { createMock } from '@golevelup/ts-jest';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

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

  it('should call a usersService.create() method with CreateUserDto object', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@test.com',
      firstname: 'Test',
    } as CreateUserDto;
    usersController.create(createUserDto);
    expect(usersService.create).toBeCalledWith(createUserDto);
  });

  it('should call a usersService.findOne() with provided id', () => {
    const userId = '1';
    const queryDto = new UserQueryDto();

    usersController.getOne(userId, queryDto);
    expect(usersService.findOne).toBeCalledWith(
      { id: userId },
      queryDto.include,
    );
  });

  it('should call a usersService.findManyWithPagination() method with provided page and size', () => {
    const queryDto: UserQueryDto = {
      page: 1,
      size: 5,
    };
    usersController.getMany(queryDto);
    expect(usersService.findManyWithPagination).toBeCalledWith(queryDto);
  });

  it('should call a usersService.update() method with provided id and payload object', () => {
    const payload: UpdateUserDto = {
      firstname: 'Test',
      id: 'testId',
    };
    usersController.update(payload);
    expect(usersService.update).toBeCalledWith(payload);
  });

  it('should call a usersService.softDelete() method with provided id', () => {
    const userId = '1';
    usersController.delete(userId);
    expect(usersService.softDelete).toBeCalledWith(userId);
  });
});
