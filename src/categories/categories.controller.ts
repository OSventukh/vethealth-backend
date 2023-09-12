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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryWhereQueryDto } from './dto/find-category.dto';
import { CategoryOrderQueryDto } from './dto/order-category.dto';
import { CategoryEntity } from './entities/category.entity';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { PaginationType } from '@/utils/types/pagination.type';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOne(@Param('id') id: string): Promise<CategoryEntity> {
    return this.categoriesService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() pagination: PaginationQueryDto,
    @Query() orderDto: CategoryOrderQueryDto,
    @Query() whereDto: CategoryWhereQueryDto,
  ): Promise<PaginationType<CategoryEntity>> | Promise<CategoryEntity> {
    if (whereDto.slug) {
      return this.categoriesService.findOne({ slug: whereDto.slug });
    }
    return this.categoriesService.findManyWithPagination(
      pagination,
      whereDto,
      orderDto.orderObject(),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.categoriesService.softDelete(id);
  }
}
