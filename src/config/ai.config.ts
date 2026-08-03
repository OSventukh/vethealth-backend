import { registerAs } from '@nestjs/config';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { AiConfig, AiProvider } from './config.type';
import validateConfig from '@/utils/validate-config';

class EnvironmentVariablesValidator {
  // Deploy panels (Coolify) can inject vars as empty strings, which @IsOptional
  // does NOT skip — treat '' as unset so an empty AI_PROVIDER can't crash boot.
  @ValidateIf((_object, value) => value !== undefined && value !== '')
  @IsEnum(AiProvider)
  @IsOptional()
  AI_PROVIDER: AiProvider;

  @IsString()
  @IsOptional()
  AI_MODEL: string;

  @IsString()
  @IsOptional()
  ANTHROPIC_API_KEY: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string;

  @IsString()
  @IsOptional()
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export default registerAs<AiConfig>('ai', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    provider:
      (process.env.AI_PROVIDER as AiProvider | undefined) ||
      AiProvider.Anthropic,
    model: process.env.AI_MODEL,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  };
});
