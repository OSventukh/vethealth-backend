import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import { AllConfigType } from './config/config.type';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);
  app.enableCors({
    origin: configService.getOrThrow('app.frontendDomain', { infer: true }),
    credentials: true,
  });
  const config = new DocumentBuilder()
    .setTitle('VetHealth API')
    .setDescription('VetHealth API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}
bootstrap();
