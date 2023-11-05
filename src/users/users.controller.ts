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
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  getOne(
    @Param('id') id: string,
    @Query() queryDto: UserQueryDto,
  ): Promise<UserEntity | null> {
    return this.usersService.findOne({ id }, queryDto.include);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: UserQueryDto,
  ): Promise<PaginationType<UserEntity>> {
    return this.usersService.findManyWithPagination(queryDto);
  }

  @UseGuards(AuthGuard('jwt'), UpdateUserGuard)
  @Patch()
  @HttpCode(HttpStatus.OK)
  update(@Body() updateUserDto: UpdateUserDto): Promise<UserEntity> {
    return this.usersService.update(updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'), DeleteUserGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.usersService.softDelete(id);
  }
}
