import {
  Controller,
  Param,
  Post,
  Get,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewEntity } from './entities/review.entity';
import { PaginationType } from '@/utils/types/pagination.type';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(): Promise<ReviewEntity> {
    return this.reviewsService.create();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOne(@Param('id') id: string): Promise<ReviewEntity> | null {
    return this.reviewsService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getMany(): Promise<PaginationType<ReviewEntity>> {
    return this.reviewsService.findManyWithPagination();
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() body: any): Promise<ReviewEntity> {
    return this.reviewsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.reviewsService.softDelete(id);
  }
}
