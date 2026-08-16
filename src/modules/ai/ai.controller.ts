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
import { AiProviderException, AiService } from './ai.service';
import { GenerateSeoMetadataDto } from './dto/generate-seo-metadata.dto';
import { SeoMetadataResult } from './tasks/seo-metadata.task';

@ApiTags('Ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // Без @Public — глобальний AuthDataGuard пускає лише автентифікованих
  // (генерація доступна будь-якій ролі, як і створення постів). Нічого не
  // зберігає — результат повертається у форму редактора на перегляд.
  @Throttle({ api: { limit: 10, ttl: minutes(1) } })
  @Post('seo-metadata')
  @HttpCode(HttpStatus.OK)
  async generateSeoMetadata(
    @Body() dto: GenerateSeoMetadataDto,
    // `passthrough` лишає звичайну обробку відповіді Nest — response
    // потрібен лише щоб дописати заголовок до помилки.
    @Res({ passthrough: true }) response: Response,
  ): Promise<SeoMetadataResult> {
    try {
      return await this.aiService.generateSeoMetadata(dto);
    } catch (error) {
      // Фільтр винятків пише лише статус і тіло, тож бекоф, який попросив
      // провайдер, довелося б викинути — віддаємо його як Retry-After.
      if (
        error instanceof AiProviderException &&
        error.retryAfterSeconds !== undefined
      ) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
      }

      throw error;
    }
  }
}
