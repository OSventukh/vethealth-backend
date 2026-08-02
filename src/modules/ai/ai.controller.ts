import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import { AiService, SeoMetadataResult } from './ai.service';
import { GenerateSeoMetadataDto } from './dto/generate-seo-metadata.dto';

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
  generateSeoMetadata(
    @Body() dto: GenerateSeoMetadataDto,
  ): Promise<SeoMetadataResult> {
    return this.aiService.generateSeoMetadata(dto);
  }
}
