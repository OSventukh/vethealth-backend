import { PaginationType } from '@/utils/types/pagination.type';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
import { DeleteUserGuard } from './guards/delete-user.guard';
import { UpdateUserGuard } from './guards/update-user.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOneUser(@Param('id') id: string): Promise<UserEntity | null> {
    return this.usersService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getAllUsers(
    @Query() queryDto: UserQueryDto,
  ): Promise<PaginationType<UserEntity>> {
    return this.usersService.findManyWithPagination(queryDto);
  }

  @UseGuards(UpdateUserGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateUser(@Body() updateUserDto: UpdateUserDto): Promise<UserEntity> {
    return this.usersService.update(updateUserDto);
  }

  @UseGuards(DeleteUserGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string): Promise<void> {
    return this.usersService.softDelete(id);
  }
}
