import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { IsNotSuperAdmin } from '../utils/validators/is-not-admin.validator';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [
    UsersService,
    IsNotExist,
    IsExist,
    IsValidIncludes,
    IsNotSuperAdmin,
  ],
  exports: [UsersService],
})
export class UsersModule {}
