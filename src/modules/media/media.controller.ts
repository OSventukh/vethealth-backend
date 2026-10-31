import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { forwardRetryAfter } from '@/modules/ai/forward-retry-after';
import { ImageAltResult } from '@/modules/ai/tasks/image-alt.task';
import { FileEntity } from '@/modules/files/entities/file.entity';
import { Roles } from '@/roles/decorators/roles.decorator';
import { RoleEnum } from '@/roles/roles.enum';
import { PaginationType } from '@/utils/types/pagination.type';
import { BulkDeleteMediaDto } from './dto/bulk-delete-media.dto';
import { DeleteMediaQueryDto } from './dto/delete-media-query.dto';
import { GenerateAltDto } from './dto/generate-alt.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaService } from './media.service';
import { BulkDeleteResult, MediaDetails } from './media.types';

/**
 * Медіатека адмінки. Без @Public — глобальний AuthDataGuard пускає лише
 * автентифікованих: перегляд і вибір доступні будь-якій ролі (автори
 * вставляють зображення у свої пости). Зміна alt, його ШІ-генерація (платна)
 * і видалення — лише Admin+: alt публічно видно на обкладинках і картинках
 * тем, тож це правка чужих матеріалів. Завантаження — `POST /files/upload`.
 */
@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findMany(@Query() query: MediaQueryDto): Promise<PaginationType<FileEntity>> {
    return this.mediaService.findMany(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MediaDetails> {
    return this.mediaService.findOne(id);
  }

  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
  ): Promise<FileEntity> {
    return this.mediaService.update(id, dto);
  }

  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeleteMediaQueryDto,
  ): Promise<void> {
    return this.mediaService.remove(id, query);
  }

  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  bulkRemove(@Body() dto: BulkDeleteMediaDto): Promise<BulkDeleteResult> {
    return this.mediaService.bulkRemove(dto.ids, dto.force);
  }

  // Ліміт як у масового SEO: редактор може проганяти alt по всій бібліотеці.
  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @Throttle({ api: { limit: 30, ttl: minutes(1) } })
  @Post(':id/alt/generate')
  @HttpCode(HttpStatus.OK)
  generateAlt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateAltDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ImageAltResult> {
    return forwardRetryAfter(response, () =>
      this.mediaService.generateAlt(id, dto),
    );
  }
}
