import {
  Controller,
  Body,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { PageEntity } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageWhereQueryDto } from './dto/find-page.dto';
import { PageOrderQueryDto } from './dto/order-page.dto';
import { PaginationType } from '@/utils/types/pagination.type';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';

@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPageDto: CreatePageDto): Promise<PageEntity> {
    return this.pagesService.create(createPageDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOne(@Param('id') id: string): Promise<PageEntity> {
    return this.pagesService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() pagination: PaginationQueryDto,
    @Query() orderDto: PageOrderQueryDto,
    @Query() whereDto: PageWhereQueryDto,
  ): Promise<PaginationType<PageEntity>> | Promise<PageEntity> {
    if (whereDto.slug) {
      return this.pagesService.findOne({ slug: whereDto.slug });
    }
    return this.pagesService.findManyWithPagination(
      pagination,
      whereDto,
      orderDto.orderObject(),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updatePageDto: UpdatePageDto,
  ): Promise<PageEntity> {
    return this.pagesService.update(id, updatePageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.pagesService.softDelete(id);
  }
}
