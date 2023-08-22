import {
  Controller,
  Body,
  Param,
  Query,
  Get,
  Post,
  Patch,
  Delete,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Pagination } from 'src/utils/types/pagination.type';
import { GetPagination } from 'src/utils/validators/pagination.validate';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOneUser(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getAllUsers(@Query() pagination: GetPagination): Promise<Pagination<User>> {
    return this.usersService.findManyWithPagination({
      page: pagination.page,
      size: pagination.size,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string): Promise<void> {
    return this.usersService.softDelete(id);
  }
}
