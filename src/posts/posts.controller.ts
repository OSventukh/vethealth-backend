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
import { Post as PostEntity } from './entities/post.entity';
import { GetPagination } from '@/utils/validators/pagination.validate';
import { PaginationType } from '@/utils/types/pagination.type';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createPost(@Body() createPostDto: CreatePostDto): Promise<PostEntity> {
    return this.postsService.create(createPostDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOnePost(@Param('id') id: string): Promise<PostEntity | null> {
    return this.postsService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getAllPosts(
    @Query() pagination: GetPagination,
  ): Promise<PaginationType<PostEntity>> {
    return this.postsService.findManyWithPagination(pagination);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updatePost(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostEntity> {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(@Param('id') id: string): Promise<void> {
    return this.postsService.softDelete(id);
  }
}
