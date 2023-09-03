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
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationType } from '@/utils/types/pagination.type';
import { GetPagination } from '@/utils/validators/pagination.validate';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOneUser(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getAllUsers(
    @Query() pagination: GetPagination,
  ): Promise<PaginationType<User>> {
    return this.usersService.findManyWithPagination({
      page: pagination.page,
      size: pagination.size,
    });
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
