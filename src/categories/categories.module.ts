import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    IsExist,
    IsNotExist,
    IsValidColumn,
    IsValidIncludes,
  ],
})
export class CategoriesModule {}
