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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { PagesService } from './pages.service';
import { PageEntity } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { PaginationType } from '@/utils/types/pagination.type';

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
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  getOne(
    @Param('id') id: string,
    @Query() queryDto: PageQueryDto,
  ): Promise<PageEntity> {
    return this.pagesService.findOne({ id }, queryDto.include);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: PageQueryDto,
  ): Promise<PaginationType<PageEntity>> | Promise<PageEntity> {
    if (queryDto?.slug) {
      return this.pagesService.findOne(
        { slug: queryDto.slug },
        queryDto.include,
      );
    }
    return this.pagesService.findManyWithPagination(queryDto);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  update(@Body() updatePageDto: UpdatePageDto): Promise<PageEntity> {
    return this.pagesService.update(updatePageDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.pagesService.softDelete(id);
  }
}
