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
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationType } from '@/utils/types/pagination.type';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostEntity } from './entities/post.entity';
import { FeaturedImagePipe } from './pipe/featured-image-validation.pipe';
import { PostsService } from './posts.service';
import { PostQueryDto } from './dto/post-query.dto';
import { AuthorOrderValidationPipe } from './pipe/author-order-validation.pipe';
import { CreatePostGuard } from './guards/create-post.guard';

@ApiTags('Posts')
@UseGuards(CreatePostGuard)
@UsePipes(FeaturedImagePipe)
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
  @UsePipes(AuthorOrderValidationPipe)
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: PostQueryDto,
  ): Promise<PaginationType<PostEntity>> | Promise<PostEntity> {
    if (queryDto?.slug) {
      return this.postsService.findOne({ slug: queryDto.slug });
    }
    return this.postsService.findManyWithPagination(queryDto);
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
