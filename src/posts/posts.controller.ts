import {
  Controller,
  Get,
  Post,
  Query,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostWhereQueryDto } from './dto/find-post.dto';
import { PostEntity } from './entities/post.entity';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { PostOrderQueryDto } from '@/posts/dto/order-post.dto';
import { PaginationType } from '@/utils/types/pagination.type';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPostDto: CreatePostDto): Promise<PostEntity> {
    return this.postsService.create(createPostDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOne(@Param('id') id: string): Promise<PostEntity | null> {
    return this.postsService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() pagination: PaginationQueryDto,
    @Query() orderDto: PostOrderQueryDto,
    @Query() whereDto?: PostWhereQueryDto,
  ): Promise<PaginationType<PostEntity>> | Promise<PostEntity> {
    if (whereDto.slug) {
      return this.postsService.findOne({ slug: whereDto.slug });
    }
    return this.postsService.findManyWithPagination(
      pagination,
      whereDto,
      orderDto.orderObject(),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostEntity> {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.postsService.softDelete(id);
  }
}
