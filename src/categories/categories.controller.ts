import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Delete,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';
import { PaginationType } from '@/utils/types/pagination.type';
import { CategoryQueryDto } from './dto/category-query.dto';
import { RolesSerializerInterceptor } from '@/auth/interceptors/roles-serializer.interceptor';
import { UpdateResult } from 'typeorm';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get(':id')
  @UseInterceptors(RolesSerializerInterceptor)
  @HttpCode(HttpStatus.OK)
  getOne(
    @Param('id') id: string,
    @Query() queryDto: CategoryQueryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.findOne({ id }, queryDto);
  }

  @Get()
  @UseInterceptors(RolesSerializerInterceptor)
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: CategoryQueryDto,
  ): Promise<PaginationType<CategoryEntity>> | Promise<CategoryEntity> {
    if (queryDto?.slug) {
      return this.categoriesService.findOne({ slug: queryDto.slug }, queryDto);
    }
    return this.categoriesService.findManyWithPagination(queryDto);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  update(
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.update(updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<UpdateResult> {
    return this.categoriesService.softDelete(id);
  }
}
