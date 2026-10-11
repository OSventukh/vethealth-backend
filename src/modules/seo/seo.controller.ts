import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { SeoGenerationOptionsDto } from '@/modules/ai/dto/seo-generation-options.dto';
import { SeoMetadataFieldsDto } from '@/modules/ai/dto/seo-metadata-fields.dto';
import { forwardRetryAfter } from '@/modules/ai/forward-retry-after';
import {
  SeoEntityType,
  SeoMetadataResult,
} from '@/modules/ai/tasks/seo-metadata.task';
import { Roles } from '@/roles/decorators/roles.decorator';
import { RoleEnum } from '@/roles/roles.enum';
import { SeoService } from './seo.service';
import { SEO_ENTITY_TYPES, SeoEntry, SeoFieldValues } from './seo.types';

const typePipe = new ParseEnumPipe(SEO_ENTITY_TYPES);

/**
 * Масове SEO: огляд заповненості, генерація і точкове збереження мета-полів
 * постів, сторінок і тем. Лише Admin+ — це правки чужих матеріалів.
 */
@ApiTags('Seo')
@Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('entries')
  @HttpCode(HttpStatus.OK)
  findEntries(): Promise<SeoEntry[]> {
    return this.seoService.findEntries();
  }

  // Масовий прогін іде запит-на-матеріал, тож ліміт вищий, ніж у
  // `/ai/seo-metadata` (10/хв) — інакше прогін по всьому сайту впирався б
  // у наш власний тротлер.
  @Throttle({ api: { limit: 30, ttl: minutes(1) } })
  @Post(':type/:id/generate')
  @HttpCode(HttpStatus.OK)
  generate(
    @Param('type', typePipe) type: SeoEntityType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() options: SeoGenerationOptionsDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Partial<SeoMetadataResult>> {
    return forwardRetryAfter(response, () =>
      this.seoService.generate(type, id, options),
    );
  }

  @Patch(':type/:id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('type', typePipe) type: SeoEntityType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SeoMetadataFieldsDto,
  ): Promise<SeoFieldValues> {
    return this.seoService.update(type, id, dto);
  }
}
