import { Module } from '@nestjs/common';
import { AiModelRegistry } from './ai-model.registry';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiModelRegistry],
  exports: [AiService],
})
export class AiModule {}
