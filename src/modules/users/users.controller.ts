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
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
import { DeleteUserGuard } from './guards/delete-user.guard';
import { UpdateUserGuard } from './guards/update-user.guard';
import { RolesSerializerInterceptor } from '@/modules/auth/interceptors/roles-serializer.interceptor';
import { RoleEnum } from '@/roles/roles.enum';
import { Roles } from '@/roles/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @Get(':id')
  @UseInterceptors(RolesSerializerInterceptor)
  @HttpCode(HttpStatus.OK)
  getOne(
    @Param('id') id: string,
    @Query() queryDto: UserQueryDto,
  ): Promise<UserEntity | null> {
    return this.usersService.findOne({ id }, queryDto.include);
  }

  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @Get()
  @UseInterceptors(RolesSerializerInterceptor)
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: UserQueryDto,
  ): Promise<PaginationType<UserEntity>> {
    return this.usersService.findManyWithPagination(queryDto);
  }

  @UseGuards(UpdateUserGuard)
  @Patch()
  @HttpCode(HttpStatus.OK)
  update(@Body() updateUserDto: UpdateUserDto): Promise<UserEntity> {
    return this.usersService.update(updateUserDto);
  }

  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @UseGuards(DeleteUserGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.usersService.softDelete(id);
  }
}
