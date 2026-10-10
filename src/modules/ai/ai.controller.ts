import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AiService } from './ai.service';
import { GenerateSeoMetadataDto } from './dto/generate-seo-metadata.dto';
import { forwardRetryAfter } from './forward-retry-after';
import { SeoMetadataResult } from './tasks/seo-metadata.task';

/** Ліміт генерацій на користувача; масове SEO (`/seo`) має свій. */
const AI_THROTTLE = { api: { limit: 10, ttl: minutes(1) } };

@ApiTags('Ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // Без @Public — глобальний AuthDataGuard пускає лише автентифікованих
  // (генерація доступна будь-якій ролі, як і створення постів). Нічого не
  // зберігає — результат повертається у форму редактора на перегляд.
  @Throttle(AI_THROTTLE)
  @Post('seo-metadata')
  @HttpCode(HttpStatus.OK)
  generateSeoMetadata(
    @Body() dto: GenerateSeoMetadataDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Partial<SeoMetadataResult>> {
    return forwardRetryAfter(response, () =>
      this.aiService.generateSeoMetadata(dto),
    );
  }
}
