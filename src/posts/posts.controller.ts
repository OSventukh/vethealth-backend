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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { PaginationType } from '@/utils/types/pagination.type';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostEntity } from './entities/post.entity';
import { FeaturedImagePipe } from './pipe/featured-image-validation.pipe';
import { PostsService } from './posts.service';
import { PostQueryDto } from './dto/post-query.dto';
import { AuthorOrderValidationPipe } from './pipe/author-order-validation.pipe';
import { CreatePostGuard } from './guards/create-post.guard';
import { RolesSerializerInterceptor } from '@/auth/interceptors/roles-serializer.interceptor';
import { ChildrenInterceptor } from './dto/interceptors/children.interceptor';

@ApiTags('Posts')
@UsePipes(FeaturedImagePipe)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), CreatePostGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPostDto: CreatePostDto): Promise<PostEntity> {
    return this.postsService.create(createPostDto);
  }

  @Get(':id')
  @UseInterceptors(RolesSerializerInterceptor)
  @HttpCode(HttpStatus.OK)
  getOne(
    @Param('id') id: string,
    @Query() queryDto: PostQueryDto,
  ): Promise<PostEntity | null> {
    return this.postsService.findOne({ id }, queryDto.include);
  }

  @Get()
  @UsePipes(AuthorOrderValidationPipe)
  @UseInterceptors(RolesSerializerInterceptor)
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: PostQueryDto,
  ): Promise<PaginationType<PostEntity>> | Promise<PostEntity> {
    if (queryDto?.slug) {
      return this.postsService.findOne(
        { slug: queryDto.slug },
        queryDto.include,
      );
    }
    return this.postsService.findManyWithPagination(queryDto);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(ChildrenInterceptor)
  @HttpCode(HttpStatus.OK)
  update(@Body() updatePostDto: UpdatePostDto): Promise<PostEntity> {
    return this.postsService.update(updatePostDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.postsService.softDelete(id);
  }
}
